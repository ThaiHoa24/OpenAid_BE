/**
 * OpenAid AI Service - Core AI Assistant Implementation
 *
 * Integrates:
 * - System Prompt chuyên biệt OpenAid
 * - Knowledge Base (RAG) retrieval
 * - Function Calling tools (12 tools covering all business domains)
 * - RBAC enforcement via Backend services
 * - Conversation context handling
 */

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';
import {
  SYSTEM_PROMPT,
} from './prompts/system-prompt.js';
import {
  knowledgeBase,
  searchKnowledgeBase,
  initializeKnowledgeBase,
} from './knowledge/index.js';
import {
  EventsTools,
  DonationTools,
  VolunteerTools,
  BatchTools,
  TripTools,
  OrganizationTools,
  TransparencyTools,
  NavigationTools,
} from './tools/index.js';
import type {
  ChatHistoryItemDto,
  SendConversationMessageDto,
} from './dto/chat.dto.js';

// ============================================
// Types & Interfaces
// ============================================

export interface CampaignRecommendationPayload {
  id: string;
  title: string;
  location: string;
  dateRange: string;
  status: 'Đang diễn ra' | 'Sắp diễn ra' | 'Cần hỗ trợ gấp' | 'Đã kết thúc' | 'Đã huỷ';
  category: string;
  summary: string;
  href: string;
  imageUrl?: string;
  volunteerHref?: string;
  donateHref?: string;
  volunteerRoles?: Array<{
    name: string;
    description?: string;
    remainingSlots: number;
  }>;
  accentVariant: 'forest' | 'amber' | 'mint';
  isSampleData: false;
}

export interface AiContext {
  user?: AuthenticatedUser | null; // null = guest
  isAuthenticated: boolean;
  userRoles: {
    isAdmin: boolean;
    isOrganizer: boolean;
    organizationIds: string[];
  };
}

function formatDateVi(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function makeConversationTitle(input: string): string {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned || 'Cuộc trò chuyện mới';
  return `${cleaned.slice(0, 50).trim()}...`;
}

const ACCENT_VARIANTS: Array<'forest' | 'amber' | 'mint'> = ['forest', 'amber', 'mint'];

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  disaster_relief:
    'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80',
  medical_aid:
    'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&auto=format&fit=crop&q=80',
  education:
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
  food_supply:
    'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&auto=format&fit=crop&q=80',
  default:
    'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&auto=format&fit=crop&q=80',
};

function resolveFallbackCampaignImage(category?: string | null): string {
  if (!category) return CATEGORY_FALLBACK_IMAGES.default;
  const key = category.toLowerCase();
  if (key.includes('medical') || key.includes('y tế') || key.includes('sức khỏe')) {
    return CATEGORY_FALLBACK_IMAGES.medical_aid;
  }
  if (key.includes('edu') || key.includes('giáo dục') || key.includes('trẻ em')) {
    return CATEGORY_FALLBACK_IMAGES.education;
  }
  if (key.includes('food') || key.includes('lương thực') || key.includes('nhu yếu')) {
    return CATEGORY_FALLBACK_IMAGES.food_supply;
  }
  if (key.includes('disaster') || key.includes('lũ') || key.includes('bão') || key.includes('thiên tai')) {
    return CATEGORY_FALLBACK_IMAGES.disaster_relief;
  }
  return CATEGORY_FALLBACK_IMAGES.default;
}

// ============================================
// AI Service
// ============================================

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI | null;
  private readonly model: string;

  // Tool instances (lazy initialized)
  private eventsTools!: EventsTools;
  private donationTools!: DonationTools;
  private volunteerTools!: VolunteerTools;
  private batchTools!: BatchTools;
  private tripTools!: TripTools;
  private organizationTools!: OrganizationTools;
  private transparencyTools!: TransparencyTools;
  private navigationTools!: NavigationTools;

  // Function declarations for Gemini
  private readonly functionDeclarations: FunctionDeclaration[];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {
    // Initialize Gemini
    const apiKey = (
      this.configService.get<string>('ai.geminiApiKey') ||
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      ''
    ).trim();
    this.model = (
      this.configService.get<string>('ai.geminiModel') ||
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-3.5-flash-lite'
    ).trim();
    this.ai = apiKey ? new GoogleGenAI({ apiKey, vertexai: false }) : null;

    if (this.ai) {
      this.logger.log(`Gemini Developer API ready (model: ${this.model})`);
    } else {
      this.logger.warn('GEMINI_API_KEY is missing in environment variables');
    }

    // Initialize tool instances with required dependencies
    this.initTools();

    // Build function declarations for Gemini
    this.functionDeclarations = this.buildFunctionDeclarations();
  }

  private initTools(): void {
    this.eventsTools = new EventsTools(this.prisma, this.orgAccess, this.transparencyRepo);
    this.donationTools = new DonationTools(this.prisma, this.orgAccess);
    this.volunteerTools = new VolunteerTools(this.prisma, this.orgAccess);
    this.batchTools = new BatchTools(this.prisma, this.orgAccess);
    this.tripTools = new TripTools(this.prisma, this.orgAccess);
    this.organizationTools = new OrganizationTools(this.prisma, this.orgAccess);
    this.transparencyTools = new TransparencyTools(this.prisma, this.orgAccess);
    this.navigationTools = new NavigationTools();
  }

  /**
   * Build Function Declarations for Gemini Function Calling
   * 12 tools covering all OpenAid business domains
   */
  private buildFunctionDeclarations(): FunctionDeclaration[] {
    return [
      // Events (3 tools)
      {
        name: 'search_events',
        description: 'Tìm kiếm chiến dịch cứu trợ (Event) theo từ khóa, địa điểm, danh mục, trạng thái. Trả về danh sách có tiến độ quyên góp, vị trí TNV, link chi tiết.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            keyword: { type: Type.STRING, description: 'Từ khóa tìm theo tên, mô tả, địa điểm, danh mục' },
            location: { type: Type.STRING, description: 'Lọc theo địa điểm (tỉnh/huyện)' },
            category: { type: Type.STRING, description: 'Lọc theo danh mục (Cứu trợ khẩn cấp, Giáo dục, Y tế, v.v.)' },
            status: { type: Type.STRING, description: 'Trạng thái: PUBLISHED, CLOSED, ALL (Organizer/Admin)' },
            itemTypeId: { type: Type.STRING, description: 'Lọc Event có nhu cầu ItemType này' },
            from: { type: Type.STRING, description: 'startDate >= từ ngày (ISO)' },
            to: { type: Type.STRING, description: 'startDate <= đến ngày (ISO)' },
            skip: { type: Type.INTEGER, description: 'Pagination skip' },
            take: { type: Type.INTEGER, description: 'Pagination take (max 20)' },
          },
        },
      },
      {
        name: 'get_event_detail',
        description: 'Xem chi tiết đầy đủ một Event: thông tin cơ bản, nhu cầu quyên góp (target/received/remaining), vị trí TNV, tiến độ tổng thể, link điều hướng.',
        parameters: {
          type: Type.OBJECT,
          properties: { eventId: { type: Type.STRING, description: 'UUID của Event' } },
          required: ['eventId'],
        },
      },
      {
        name: 'get_event_status',
        description: 'Lấy trạng thái nhanh của Event: fillRatio, needs summary, volunteer slots, có đang active không. Dùng cho follow-up questions.',
        parameters: {
          type: Type.OBJECT,
          properties: { eventId: { type: Type.STRING, description: 'UUID của Event' } },
          required: ['eventId'],
        },
      },

      // Donations (3 tools)
      {
        name: 'get_my_donations',
        description: 'Lấy lịch sử quyên góp của user hiện tại (cần đăng nhập). Trả về trackingId, status, event, batch, link tra cứu. userId được tự động điền từ auth context.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: 'Lọc theo status: PENDING, RECEIVED, IN_BATCH, DISTRIBUTED...' },
            skip: { type: Type.INTEGER, description: 'Pagination' },
            take: { type: Type.INTEGER, description: 'Pagination (max 50)' },
          },
        },
      },
      {
        name: 'track_donation',
        description: 'Tra cứu hành trình đơn quyên góp theo TrackingId (PUBLIC - không cần đăng nhập). Trả về timeline, batch, trip, điểm phát, minh chứng ảnh, transparency logs công khai.',
        parameters: {
          type: Type.OBJECT,
          properties: { trackingId: { type: Type.STRING, description: 'Mã tra cứu (VD: TRK-A1B2C3D4)' } },
          required: ['trackingId'],
        },
      },
      {
        name: 'get_donation_detail',
        description: 'Chi tiết đơn quyên góp theo Donation ID (cần quyền: donor hoặc Organizer/Admin).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            donationId: { type: Type.STRING, description: 'UUID của Donation' },
            userId: { type: Type.STRING, description: 'User ID để verify quyền' },
          },
          required: ['donationId'],
        },
      },

      // Volunteers (3 tools)
      {
        name: 'search_volunteer_opportunities',
        description: 'Tìm kiếm vị trí tình nguyện viên (VolunteerRole) còn slot trống. Lọc theo từ khóa, địa điểm, Event, tên vị trí. Trả về remainingSlots, event info, link đăng ký.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            keyword: { type: Type.STRING, description: 'Từ khóa tìm kiếm' },
            location: { type: Type.STRING, description: 'Địa điểm' },
            eventId: { type: Type.STRING, description: 'Event cụ thể' },
            roleName: { type: Type.STRING, description: 'Tên vị trí (vd: Phân loại kho)' },
            hasOpenSlots: { type: Type.BOOLEAN, description: 'Chỉ hiện còn slot (default true)' },
            skip: { type: Type.INTEGER },
            take: { type: Type.INTEGER },
          },
        },
      },
      {
        name: 'get_my_volunteer_applications',
        description: 'Lấy lịch sử đăng ký TNV của user hiện tại (cần đăng nhập). Status, attendance, trip assignments, link xem chi tiết. userId được tự động điền từ auth context.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: 'PENDING, APPROVED, REJECTED' },
            skip: { type: Type.INTEGER },
            take: { type: Type.INTEGER },
          },
        },
      },
      {
        name: 'get_volunteer_application_detail',
        description: 'Chi tiết đơn đăng ký TNV (cần quyền: applicant hoặc Organizer/Admin).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            applicationId: { type: Type.STRING, description: 'UUID VolunteerApplication' },
            userId: { type: Type.STRING, description: 'User ID để verify' },
          },
          required: ['applicationId'],
        },
      },

      // Batches (2 tools)
      {
        name: 'get_batch_detail',
        description: 'Chi tiết lô hàng (Batch): donations, trips, inventory, reconciliation, timeline. Cần Organizer/Admin.',
        parameters: {
          type: Type.OBJECT,
          properties: { batchId: { type: Type.STRING, description: 'UUID Batch' }, userId: { type: Type.STRING } },
          required: ['batchId'],
        },
      },
      {
        name: 'get_batches_by_event',
        description: 'Danh sách Batch của Event (Organizer/Admin). Lọc theo status.',
        parameters: {
          type: Type.OBJECT,
          properties: { eventId: { type: Type.STRING }, status: { type: Type.STRING }, userId: { type: Type.STRING } },
          required: ['eventId'],
        },
      },

      // Trips (2 tools)
      {
        name: 'get_trip_detail',
        description: 'Chi tiết chuyến xe (Trip): batches, volunteers, points, records, evidence, timeline. Organizer/Admin hoặc Volunteer gán trip.',
        parameters: {
          type: Type.OBJECT,
          properties: { tripId: { type: Type.STRING }, userId: { type: Type.STRING } },
          required: ['tripId'],
        },
      },
      {
        name: 'get_trips_by_event',
        description: 'Danh sách Trip của Event (Organizer/Admin/Volunteer gán).',
        parameters: {
          type: Type.OBJECT,
          properties: { eventId: { type: Type.STRING }, status: { type: Type.STRING }, userId: { type: Type.STRING } },
          required: ['eventId'],
        },
      },

      // Organization (2 tools)
      {
        name: 'get_organization_info',
        description: 'Thông tin tổ chức (public + private nếu có quyền). Tìm theo ID, code, hoặc userId (lấy org của user).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            organizationId: { type: Type.STRING },
            code: { type: Type.STRING },
            userId: { type: Type.STRING },
          },
        },
      },
      {
        name: 'get_my_organizations',
        description: 'Danh sách tổ chức user là thành viên (cần đăng nhập). userId được tự động điền từ auth context.',
        parameters: { type: Type.OBJECT, properties: {} },
      },

      // Transparency (2 tools)
      {
        name: 'get_transparency_stats',
        description: 'Thống kê minh bạch: Admin (toàn hệ thống), Organizer (event/org của mình), User (cá nhân: donations, volunteer hours).',
        parameters: {
          type: Type.OBJECT,
          properties: { eventId: { type: Type.STRING }, organizationId: { type: Type.STRING }, userId: { type: Type.STRING } },
        },
      },
      {
        name: 'get_entity_timeline',
        description: 'Timeline audit log của một entity (DONATION, BATCH, TRIP, EVENT, VOLUNTEER_APPLICATION...). Public only cho non-admin.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            entityType: { type: Type.STRING, description: 'DONATION, BATCH, TRIP, EVENT, VOLUNTEER_APPLICATION, EVIDENCE...' },
            entityId: { type: Type.STRING },
            isPublicOnly: { type: Type.BOOLEAN, description: 'Chỉ log công khai (default true cho non-admin)' },
          },
          required: ['entityType', 'entityId'],
        },
      },

      // Navigation (1 tool)
      {
        name: 'get_feature_links',
        description: 'Cung cấp đường dẫn chính xác (URL) đến các tính năng trên website OpenAid. Hỗ trợ params động (eventId, trackingId...).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            feature: { type: Type.STRING, description: 'Tên tính năng: events, event-detail, donate, track, track-detail, volunteer-apply, my-donations, my-activities, organizer-dashboard, organizer-events, organizer-batches, organizer-trips, organizer-transparency, admin-dashboard...' },
            params: { type: Type.OBJECT, description: 'Tham số động: { eventId, trackingId, batchId, tripId... }', properties: { eventId: { type: Type.STRING }, trackingId: { type: Type.STRING }, batchId: { type: Type.STRING }, tripId: { type: Type.STRING } } },
          },
          required: ['feature'],
        },
      },
    ];
  }

  // ============================================
  // Core Generation Logic
  // ============================================

  /**
   * Main entry: Generate AI reply with RAG + Function Calling + Context
   */
  async generateReply(
    message: string,
    history: ChatHistoryItemDto[] = [],
    context: AiContext,
  ): Promise<{ reply: string; campaigns: CampaignRecommendationPayload[]; usedTools: string[] }> {
    if (!this.ai) {
      throw new ServiceUnavailableException('GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm vào OpenAid_BE/.env');
    }

    // 1. Initialize Knowledge Base if needed
    if (!knowledgeBase['initialized']) {
      await initializeKnowledgeBase();
    }

    // 2. RAG: Retrieve relevant knowledge chunks
    const ragContext = await searchKnowledgeBase(message, 5);

    // 3. Build system instruction with dynamic context
    const systemInstruction = this.buildSystemInstruction(context, ragContext);

    // 4. Build conversation contents (last 10 messages + current)
    const contents = this.buildContents(history, message);

    // 5. Generate with Function Calling loop
    const collectedCampaigns: CampaignRecommendationPayload[] = [];
    const usedTools: string[] = [];

    try {
      let response = await this.ai.models.generateContent({
        model: this.model,
        contents: contents as never,
        config: { systemInstruction, tools: [{ functionDeclarations: this.functionDeclarations }] },
      });

      // Function calling loop (max 4 steps)
      for (let step = 0; step < 4; step++) {
        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) break;

        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) contents.push(modelContent as unknown as Record<string, unknown>);

        const toolResponses = await Promise.all(
          functionCalls.map(async (call) => {
            const toolName = call.name ?? '';
            const toolArgs = (call.args ?? {}) as Record<string, unknown>;
            usedTools.push(toolName);

            const args = this.enrichArgsWithContext(toolArgs, context, toolName);
            const result = await this.executeTool(toolName, args, context, collectedCampaigns);
            return { functionResponse: { name: toolName, response: { result } } };
          }),
        );

        contents.push({ role: 'user', parts: toolResponses });
        response = await this.ai.models.generateContent({
          model: this.model,
          contents: contents as never,
          config: { systemInstruction, tools: [{ functionDeclarations: this.functionDeclarations }] },
        });
      }

      return {
        reply: response.text?.trim() || 'Xin lỗi, tôi chưa thể tổng hợp câu trả lời lúc này. Vui lòng thử lại.',
        campaigns: collectedCampaigns,
        usedTools,
      };
    } catch (error) {
      return this.handleGeminiError(error);
    }
  }

  /**
   * Build system instruction with user context + RAG context
   */
  private buildSystemInstruction(context: AiContext, ragContext: string): string {
    let instruction = SYSTEM_PROMPT;

    // Add user context
    if (context.isAuthenticated && context.user) {
      instruction += `\n\n--- NGỮ CẢNH NGƯỜI DÙNG HIỆN TẠI ---\n`;
      instruction += `User: ${context.user.fullName} (${context.user.email})\n`;
      instruction += `SystemRole: ${context.user.systemRole}\n`;
      if (context.userRoles.isOrganizer) {
        instruction += `Vai trò: ORGANIZER của tổ chức: ${context.userRoles.organizationIds.join(', ')}\n`;
        instruction += `Bạn CÓ THỂ truy xuất: dữ liệu tổ chức mình (events, donations, volunteers, batches, trips, stats).\n`;
      }
      if (context.userRoles.isAdmin) {
        instruction += `Vai trò: ADMIN hệ thống\n`;
        instruction += `Bạn CÓ THỂ truy xuất: TOÀN BỘ dữ liệu hệ thống.\n`;
      }
      if (!context.userRoles.isOrganizer && !context.userRoles.isAdmin) {
        instruction += `Vai trò: USER thông thường\n`;
        instruction += `Bạn CÓ THỂ truy xuất: DỮ LIỆU CÁ NHÂN CỦA CHÍNH BẠN (my donations, my volunteer apps) + dữ liệu công khai.\n`;
        instruction += `QUAN TRỌNG: Khi user hỏi "của tôi", "của mình", "tôi đã...", "lịch sử của tôi" -> ĐÂY LÀ YÊU CẦU TRUY XUẤT DỮ LIỆU CÁ NHÂN CỦA USER HIỆN TẠI (${context.user?.fullName || 'User'}). BẮT BUỘC GỌI FUNCTION CALLING: get_my_volunteer_applications, get_my_donations.\n`;
      }
    } else {
      instruction += `\n\n--- NGỮ CẢNH NGƯỜI DÙNG HIỆN TẠI ---\n`;
      instruction += `User: KHÁCH (Guest - chưa đăng nhập)\n`;
      instruction += `Quyền: CHỈ dữ liệu công khai (Event PUBLISHED, tra cứu TrackingId public).\n`;
      instruction += `KHÔNG được truy xuất: dữ liệu cá nhân, dữ liệu Organizer/Admin.\n`;
    }

    // Add RAG context if available
    if (ragContext.trim()) {
      instruction += ragContext;
      instruction += `\nLƯU Ý: Sử dụng kiến thức trên để trả lời câu hỏi KHÔNG cần dữ liệu real-time (FAQ, hướng dẫn, quy trình).\n`;
      instruction += `Đối với dữ liệu THỜI GIAN THỰC (chiến dịch đang mở, trackingId, lịch sử cá nhân) -> BẮT BUỘC gọi Function Calling.\n`;
    }

    instruction += `\nQUY TẮC TRÌNH BÀY DANH SÁCH CHIẾN DỊCH:\n- Luôn đánh số thứ tự tăng dần chuẩn xác (1., 2., 3., ...), KHÔNG lặp lại số 1.\n- Giao diện sẽ tự hiển thị thẻ trực quan có ảnh & nút đăng ký cho các chiến dịch trả về từ tool, nên phần chữ chỉ cần tóm tắt ngắn gọn, rõ ràng theo từng chiến dịch.\n`;

    return instruction;
  }

  /**
   * Build conversation contents for Gemini
   */
  private buildContents(history: ChatHistoryItemDto[], currentMessage: string): Array<Record<string, unknown>> {
    const contents: Array<Record<string, unknown>> = [];

    // Add last 10 history messages
    for (const h of history.slice(-10)) {
      contents.push({ role: h.role, parts: [{ text: h.text }] });
    }

    // Add current user message
    contents.push({ role: 'user', parts: [{ text: currentMessage }] });

    return contents;
  }

  /**
   * Execute Function Calling tool with RBAC enforcement
   * Args are already enriched before calling this method
   */
  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: AiContext,
    collectedCampaigns: CampaignRecommendationPayload[],
  ): Promise<any> {
    try {
      switch (name) {
        // Events
        case 'search_events': {
          const res = await this.eventsTools.searchEvents(args as any, context.user ?? null);
          const ids = Array.isArray(res?.events)
            ? res.events.map((e: any) => e?.id).filter((id: unknown): id is string => typeof id === 'string')
            : [];
          await this.collectCampaignCardsByEventIds(ids, collectedCampaigns);
          return res;
        }
        case 'get_event_detail': {
          const res = await this.eventsTools.getEventDetail(args as any, context.user ?? null);
          const id = res?.event?.id ?? res?.id ?? (typeof args.eventId === 'string' ? args.eventId : null);
          if (id) await this.collectCampaignCardsByEventIds([id], collectedCampaigns);
          return res;
        }
        case 'get_event_status':
          return await this.eventsTools.getEventStatus(args as any, context.user ?? null);

        // Donations
        case 'get_my_donations':
          if (!context.isAuthenticated) throw new Error('Cần đăng nhập để xem lịch sử quyên góp');
          return await this.donationTools.getMyDonations(args as any, context.user!);
        case 'track_donation':
          return await this.donationTools.trackDonation(args as any);
        case 'get_donation_detail':
          return await this.donationTools.getDonationDetail(args as any, context.user ?? null);

        // Volunteers
        case 'search_volunteer_opportunities': {
          const res = await this.volunteerTools.searchVolunteerOpportunities(args as any, context.user ?? null);
          const list = Array.isArray(res?.opportunities)
            ? res.opportunities
            : Array.isArray(res?.roles)
              ? res.roles
              : Array.isArray(res)
                ? res
                : [];
          const ids = list
            .map((item: any) => item?.event?.id ?? item?.eventId)
            .filter((id: unknown): id is string => typeof id === 'string');
          await this.collectCampaignCardsByEventIds(ids, collectedCampaigns);
          return res;
        }
        case 'get_my_volunteer_applications':
          if (!context.isAuthenticated) throw new Error('Cần đăng nhập để xem lịch sử đăng ký TNV');
          return await this.volunteerTools.getMyVolunteerApplications(args as any, context.user!);
        case 'get_volunteer_application_detail':
          return await this.volunteerTools.getVolunteerApplicationDetail(args as any, context.user ?? null);

        // Batches
        case 'get_batch_detail':
          return await this.batchTools.getBatchDetail(args as any, context.user ?? null);
        case 'get_batches_by_event':
          return await this.batchTools.getBatchesByEvent(args as any, context.user ?? null);

        // Trips
        case 'get_trip_detail':
          return await this.tripTools.getTripDetail(args as any, context.user ?? null);
        case 'get_trips_by_event':
          return await this.tripTools.getTripsByEvent(args as any, context.user ?? null);

        // Organizations
        case 'get_organization_info':
          return await this.organizationTools.getOrganizationInfo(args as any, context.user ?? null);
        case 'get_my_organizations':
          if (!context.isAuthenticated) throw new Error('Cần đăng nhập');
          return await this.organizationTools.getMyOrganizations(args as any, context.user!);

        // Transparency
        case 'get_transparency_stats':
          return await this.transparencyTools.getTransparencyStats(args as any, context.user ?? null);
        case 'get_entity_timeline':
          return await this.transparencyTools.getEntityTimeline(args as any, context.user ?? null);

        // Navigation
        case 'get_feature_links':
          return this.navigationTools.getFeatureLink(args as any);

        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      this.logger.error(`Tool ${name} failed:`, error);
      return { error: error instanceof Error ? error.message : 'Tool execution failed' };
    }
  }

  /**
   * Enrich tool args with context (userId, organizationIds, etc.)
   */
  private enrichArgsWithContext(args: Record<string, unknown>, context: AiContext, toolName?: string): Record<string, unknown> {
    const enriched = { ...args } as Record<string, unknown>;

    // Auto-inject userId for tools that need it
    if (context.isAuthenticated && context.user) {
      const tName = toolName || '';
      const needsUserId = tName.startsWith('get_my_') || ['get_my_donations', 'get_my_volunteer_applications', 'get_my_organizations'].includes(tName);
      if (needsUserId && !enriched.userId) {
        enriched.userId = context.user.id;
        this.logger.debug(`Injected userId ${context.user.id} for tool ${tName}`);
      }
    }

    return enriched;
  }

  /**
   * Handle Gemini API errors with user-friendly messages
   */
  private handleGeminiError(error: unknown): Promise<{ reply: string; campaigns: CampaignRecommendationPayload[]; usedTools: string[] }> {
    const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined;
    const rawMessage = error instanceof Error ? error.message : 'Unknown Gemini API error';

    this.logger.error(`Gemini API failed (status=${status ?? 'unknown'}): ${rawMessage.slice(0, 300)}`);

    if (status === 401) throw new ServiceUnavailableException('Xác thực Gemini API thất bại (401). Kiểm tra GEMINI_API_KEY.');
    if (status === 403) throw new ServiceUnavailableException('API Key không có quyền truy cập Gemini (403).');
    if (status === 404) throw new ServiceUnavailableException(`Model "${this.model}" không khả dụng (404).`);
    if (status === 429) throw new HttpException('Trợ lý AI đạt giới hạn lượt gọi (429). Vui lòng chờ vài giây.', HttpStatus.TOO_MANY_REQUESTS);

    throw new ServiceUnavailableException('Trợ lý AI đang tạm bận. Vui lòng thử lại sau.');
  }

  // ============================================
  // Conversation Management (Existing)
  // ============================================

  async chatGuest(message: string, history: ChatHistoryItemDto[] = []) {
    const context: AiContext = { user: null, isAuthenticated: false, userRoles: { isAdmin: false, isOrganizer: false, organizationIds: [] } };
    return this.generateReply(message, history, context);
  }

  async listConversations(userId: string) {
    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return conversations.map((conv) => this.serializeConversation(conv));
  }

  async sendUserMessage(userId: string, dto: SendConversationMessageDto) {
    // Get user context for RBAC
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true, systemRole: true } });
    const memberships = await this.prisma.organizationMember.findMany({ where: { userId, role: 'ORGANIZER' }, select: { organizationId: true } });

    const context: AiContext = {
      user: user ? { id: user.id, email: user.email, fullName: user.fullName, systemRole: user.systemRole } : null,
      isAuthenticated: true,
      userRoles: {
        isAdmin: user?.systemRole === 'ADMIN',
        isOrganizer: memberships.length > 0,
        organizationIds: memberships.map(m => m.organizationId),
      },
    };

    let conversationId = dto.conversationId;
    let conversationTitle = makeConversationTitle(dto.message);
    let history: ChatHistoryItemDto[] = [];

    if (conversationId) {
      const existing = await this.prisma.chatConversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });
      if (!existing) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
      conversationTitle = existing.title;
      history = existing.messages.slice(-10).map(m => ({ role: m.role === 'USER' ? 'user' : 'model', text: m.content }));
    } else {
      const created = await this.prisma.chatConversation.create({ data: { userId, title: conversationTitle } });
      conversationId = created.id;
    }

    await this.prisma.chatMessage.create({ data: { conversationId, role: 'USER', content: dto.message.trim() } });

    const aiResult = await this.generateReply(dto.message.trim(), history, context);

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: aiResult.reply,
        campaigns: aiResult.campaigns.length > 0 ? (aiResult.campaigns as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    await this.prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    return {
      conversation: { id: conversationId, title: conversationTitle, updatedAt: new Date().toISOString() },
      userMessage: this.serializeMessage({ id: '', role: 'USER', content: dto.message.trim(), campaigns: null, feedback: null, createdAt: new Date() }),
      assistantMessage: this.serializeMessage({ ...assistantMessage, role: 'ASSISTANT' }),
      usedTools: aiResult.usedTools,
    };
  }

  async renameConversation(userId: string, conversationId: string, title: string) {
    const existing = await this.prisma.chatConversation.findFirst({ where: { id: conversationId, userId } });
    if (!existing) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
    const updated = await this.prisma.chatConversation.update({ where: { id: conversationId }, data: { title: title.trim() } });
    return { id: updated.id, title: updated.title, updatedAt: updated.updatedAt.toISOString() };
  }

  async deleteConversation(userId: string, conversationId: string) {
    const existing = await this.prisma.chatConversation.findFirst({ where: { id: conversationId, userId } });
    if (!existing) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
    await this.prisma.chatConversation.delete({ where: { id: conversationId } });
    return { deleted: true, id: conversationId };
  }

  async updateMessageFeedback(userId: string, messageId: string, feedback: 'like' | 'dislike' | null) {
    const existing = await this.prisma.chatMessage.findFirst({ where: { id: messageId, conversation: { userId } } });
    if (!existing) throw new NotFoundException('Không tìm thấy tin nhắn.');
    const dbFeedback = feedback === 'like' ? 'LIKE' : feedback === 'dislike' ? 'DISLIKE' : null;
    const updated = await this.prisma.chatMessage.update({ where: { id: messageId }, data: { feedback: dbFeedback } });
    return this.serializeMessage({ ...updated, role: updated.role as 'USER' | 'ASSISTANT' });
  }

  async regenerateMessage(userId: string, conversationId: string, targetMessageId?: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');

    const msgs = conversation.messages;
    if (msgs.length === 0) throw new BadRequestException('Cuộc trò chuyện chưa có tin nhắn.');

    let targetIndex = targetMessageId ? msgs.findIndex(m => m.id === targetMessageId && m.role === 'ASSISTANT') : -1;
    if (targetIndex === -1) for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'ASSISTANT') { targetIndex = i; break; }

    let userIndex = -1;
    for (let i = (targetIndex > 0 ? targetIndex - 1 : msgs.length - 1); i >= 0; i--) if (msgs[i].role === 'USER') { userIndex = i; break; }
    if (userIndex === -1) throw new BadRequestException('Không tìm thấy câu hỏi để tạo lại.');

    const userPrompt = msgs[userIndex].content;
    const history: ChatHistoryItemDto[] = msgs.slice(Math.max(0, userIndex - 10), userIndex).map(m => ({ role: m.role === 'USER' ? 'user' : 'model', text: m.content }));

    // Get user context
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true, systemRole: true } });
    const memberships = await this.prisma.organizationMember.findMany({ where: { userId, role: 'ORGANIZER' }, select: { organizationId: true } });
    const context: AiContext = { user: user ? { id: user.id, email: user.email, fullName: user.fullName, systemRole: user.systemRole } : null, isAuthenticated: true, userRoles: { isAdmin: user?.systemRole === 'ADMIN', isOrganizer: memberships.length > 0, organizationIds: memberships.map(m => m.organizationId) } };

    const aiResult = await this.generateReply(userPrompt, history, context);

    let savedAssistant;
    if (targetIndex !== -1) {
      savedAssistant = await this.prisma.chatMessage.update({ where: { id: msgs[targetIndex].id }, data: { content: aiResult.reply, campaigns: aiResult.campaigns.length > 0 ? (aiResult.campaigns as unknown as Prisma.InputJsonValue) : Prisma.JsonNull, feedback: null } });
    } else {
      savedAssistant = await this.prisma.chatMessage.create({ data: { conversationId, role: 'ASSISTANT', content: aiResult.reply, campaigns: aiResult.campaigns.length > 0 ? (aiResult.campaigns as unknown as Prisma.InputJsonValue) : Prisma.JsonNull } });
    }

    await this.prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return { assistantMessage: this.serializeMessage({ ...savedAssistant, role: 'ASSISTANT' }) };
  }

  // ============================================
  // Campaign Card Builder (with real DB images)
  // ============================================

  private async collectCampaignCardsByEventIds(
    eventIds: string[],
    collectedCampaigns: CampaignRecommendationPayload[],
  ): Promise<void> {
    const uniqueNewIds = Array.from(new Set(eventIds))
      .filter((id) => !collectedCampaigns.some((c) => c.id === id))
      .slice(0, Math.max(0, 6 - collectedCampaigns.length));

    if (uniqueNewIds.length === 0) return;

    const events = await this.prisma.event.findMany({
      where: { id: { in: uniqueNewIds } },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        category: true,
        startDate: true,
        endDate: true,
        status: true,
        organization: { select: { name: true } },
        donationNeeds: {
          select: {
            targetQuantity: true,
            itemType: { select: { name: true } },
            unit: { select: { name: true } },
            donations: {
              where: { status: { in: ['RECEIVED', 'IN_BATCH', 'DISTRIBUTED'] } },
              select: { receivedQuantity: true },
            },
          },
        },
        volunteerRoles: {
          select: {
            name: true,
            description: true,
            quantity: true,
            _count: {
              select: {
                applications: { where: { status: 'APPROVED' } },
              },
            },
          },
        },
        trips: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            evidence: {
              where: { reviewStatus: 'APPROVED' },
              take: 1,
              orderBy: { uploadedAt: 'desc' },
              select: { imageUrl: true },
            },
          },
        },
        donations: {
          where: { photoUrl: { not: null } },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { photoUrl: true },
        },
      },
    });

    // Preserve original tool result order
    const byId = new Map(events.map((e) => [e.id, e]));
    const now = new Date();

    for (const id of uniqueNewIds) {
      const ev = byId.get(id);
      if (!ev) continue;

      const needs = ev.donationNeeds.map((n) => {
        const target = Number(n.targetQuantity);
        const received = n.donations.reduce((sum, d) => sum + Number(d.receivedQuantity), 0);
        return {
          item: n.itemType.name,
          unit: n.unit.name,
          target,
          received,
          remaining: Math.max(0, target - received),
        };
      });

      const totalTarget = needs.reduce((s, n) => s + n.target, 0);
      const totalReceived = needs.reduce((s, n) => s + n.received, 0);
      const fillRatio = totalTarget > 0 ? totalReceived / totalTarget : 1;

      let status: CampaignRecommendationPayload['status'] = 'Đang diễn ra';
      if (ev.status === 'CLOSED') status = 'Đã kết thúc';
      else if (ev.status === 'CANCELLED') status = 'Đã huỷ';
      else if (ev.startDate > now) status = 'Sắp diễn ra';
      else if (fillRatio < 0.4) status = 'Cần hỗ trợ gấp';

      const dateRange = ev.endDate
        ? `${formatDateVi(ev.startDate)} - ${formatDateVi(ev.endDate)}`
        : `Từ ${formatDateVi(ev.startDate)}`;

      const evidenceImg = ev.trips.flatMap((t) => t.evidence).find((img) => Boolean(img.imageUrl))?.imageUrl;
      const donationImg = ev.donations[0]?.photoUrl ?? undefined;
      const imageUrl = evidenceImg || donationImg || resolveFallbackCampaignImage(ev.category);

      const volunteerRoles = ev.volunteerRoles.map((r) => ({
        name: r.name,
        description: r.description?.trim() || undefined,
        remainingSlots: Math.max(0, r.quantity - r._count.applications),
      }));

      const topNeedsText = needs
        .filter((n) => n.remaining > 0)
        .slice(0, 2)
        .map((n) => `${n.item} (thiếu ${n.remaining} ${n.unit})`)
        .join(', ');

      const summary =
        ev.description?.trim() ||
        (topNeedsText ? `Đang cần bổ sung: ${topNeedsText}.` : `Tổ chức bởi ${ev.organization.name}.`);

      const idx = collectedCampaigns.length;
      collectedCampaigns.push({
        id: ev.id,
        title: ev.title,
        location: ev.location,
        dateRange,
        status,
        category: ev.category || 'Cứu trợ hiện vật',
        summary,
        href: `/events/${ev.id}`,
        imageUrl,
        volunteerHref: `/volunteer/apply/${ev.id}`,
        donateHref: `/donate/${ev.id}`,
        volunteerRoles: volunteerRoles.length > 0 ? volunteerRoles : undefined,
        accentVariant: ACCENT_VARIANTS[idx % ACCENT_VARIANTS.length],
        isSampleData: false,
      });
    }
  }

  // ============================================
  // Serialization Helpers
  // ============================================

  private serializeMessage(m: { id: string; role: string; content: string; campaigns: Prisma.JsonValue | null; feedback: string | null; createdAt: Date }) {
    const campaigns = Array.isArray(m.campaigns) ? (m.campaigns as unknown as CampaignRecommendationPayload[]) : undefined;
    return { id: m.id, role: m.role === 'USER' ? 'user' : 'assistant', content: m.content, createdAt: m.createdAt.toISOString(), feedback: m.feedback === 'LIKE' ? 'like' : m.feedback === 'DISLIKE' ? 'dislike' : null, campaigns: campaigns?.length ? campaigns : undefined };
  }

  private serializeConversation(conv: { id: string; title: string; updatedAt: Date; messages: Array<{ id: string; role: string; content: string; campaigns: Prisma.JsonValue | null; feedback: string | null; createdAt: Date }> }) {
    return { id: conv.id, title: conv.title, updatedAt: conv.updatedAt.toISOString(), messages: conv.messages.map(m => this.serializeMessage(m)) };
  }
}