/**
 * Function Calling Tools - Navigation (Cung cấp đường dẫn chính xác đến các chức năng web)
 * Không truy vấn DB, chỉ trả về mapping URL cố định
 */

export interface GetFeatureLinksArgs {
  feature: string; // Tên tính năng cần link
  params?: Record<string, string>; // Tham số động (eventId, trackingId, etc.)
}

export class NavigationTools {
  // Mapping tính năng -> URL pattern
  private readonly featureRoutes: Record<string, { pattern: string; requiredParams?: string[]; description: string }> = {
    // Public pages
    'home': { pattern: '/', description: 'Trang chủ OpenAid' },
    'events': { pattern: '/events', description: 'Danh sách chiến dịch cứu trợ công khai' },
    'event-detail': { pattern: '/events/{eventId}', requiredParams: ['eventId'], description: 'Chi tiết chiến dịch' },
    'track': { pattern: '/track', description: 'Trang tra cứu minh bạch (nhập TrackingId)' },
    'track-detail': { pattern: '/track/{trackingId}', requiredParams: ['trackingId'], description: 'Tra cứu chi tiết theo TrackingId' },
    'donate': { pattern: '/donate/{eventId}', requiredParams: ['eventId'], description: 'Đăng ký quyên góp cho chiến dịch' },
    'volunteer-apply': { pattern: '/volunteer/apply/{eventId}', requiredParams: ['eventId'], description: 'Đăng ký tình nguyện viên cho chiến dịch' },
    'about': { pattern: '/about', description: 'Về OpenAid - Sứ mệnh, đội ngũ' },
    'how-it-works': { pattern: '/how-it-works', description: 'Cách thức hoạt động của OpenAid (4 bước)' },
    'login': { pattern: '/login', description: 'Đăng nhập tài khoản' },
    'register': { pattern: '/register', description: 'Đăng ký tài khoản mới' },

    // User pages (cần đăng nhập)
    'my-donations': { pattern: '/my/donations', description: 'Lịch sử quyên góp cá nhân' },
    'my-activities': { pattern: '/my/activities', description: 'Hoạt động của tôi (đăng ký TNV, check-in)' },
    'profile': { pattern: '/profile', description: 'Hồ sơ cá nhân' },

    // Organizer pages (cần Organizer)
    'organizer-dashboard': { pattern: '/organizer/dashboard', description: 'Bàn Điều Phối Organizer - Tổng quan' },
    'organizer-events': { pattern: '/organizer/events', description: 'Quản lý chiến dịch cứu trợ' },
    'organizer-events-new': { pattern: '/organizer/events/new', description: 'Tạo chiến dịch mới' },
    'organizer-event-detail': { pattern: '/organizer/events/{eventId}', requiredParams: ['eventId'], description: 'Chi tiết quản lý chiến dịch' },
    'organizer-volunteers': { pattern: '/organizer/volunteers', description: 'Duyệt & quản lý tình nguyện viên' },
    'organizer-donations': { pattern: '/organizer/donations', description: 'Tiếp nhận & quản lý quyên góp' },
    'organizer-inventory': { pattern: '/organizer/inventory', description: 'Sổ cái kho bãi - Tồn kho' },
    'organizer-batches': { pattern: '/organizer/batches', description: 'Đóng gói lô hàng (Batch)' },
    'organizer-batch-detail': { pattern: '/organizer/batches/{batchId}', requiredParams: ['batchId'], description: 'Chi tiết lô hàng & đối soát' },
    'organizer-trips': { pattern: '/organizer/trips', description: 'Quản lý chuyến xe phân phối' },
    'organizer-trip-detail': { pattern: '/organizer/trips/{tripId}', requiredParams: ['tripId'], description: 'Chi tiết chuyến xe & ghi nhận phân phối' },
    'organizer-transparency': { pattern: '/organizer/transparency', description: 'Minh bạch & Đối soát - Thống kê, Timeline, Evidence' },
    'organizer-organization': { pattern: '/organizer/organization', description: 'Quản lý tổ chức & thành viên' },

    // Admin pages (cần Admin)
    'admin-dashboard': { pattern: '/admin/dashboard', description: 'Bàn Quản Trị Hệ thống - Tổng quan' },
    'admin-organizations': { pattern: '/admin/organizations', description: 'Xét duyệt & quản lý tổ chức' },
    'admin-users': { pattern: '/admin/users', description: 'Quản lý người dùng' },
    'admin-events': { pattern: '/admin/events', description: 'Kiểm toán chiến dịch' },
  };

  /**
   * Lấy link cho một tính năng
   */
  getFeatureLink(args: GetFeatureLinksArgs): any {
    const feature = args.feature.toLowerCase().trim();
    const route = this.featureRoutes[feature];

    if (!route) {
      // Tìm kiếm fuzzy
      const matches = Object.entries(this.featureRoutes)
        .filter(([key]) => key.includes(feature) || feature.includes(key))
        .map(([key, value]) => ({ feature: key, ...value }));

      if (matches.length > 0) {
        return {
          found: false,
          message: `Không tìm thấy tính năng chính xác "${args.feature}". Các tính năng gần đúng:`,
          suggestions: matches.slice(0, 5),
        };
      }

      return {
        found: false,
        message: `Không tìm thấy tính năng "${args.feature}". Xem danh sách đầy đủ dưới đây.`,
        allFeatures: Object.entries(this.featureRoutes).map(([key, value]) => ({
          feature: key,
          description: value.description,
          exampleUrl: value.pattern,
        })),
      };
    }

    // Build URL with params
    let url = route.pattern;
    if (route.requiredParams) {
      for (const param of route.requiredParams) {
        const value = args.params?.[param];
        if (!value) {
          return {
            found: false,
            message: `Thiếu tham số bắt buộc "${param}" cho tính năng "${feature}"`,
            requiredParams: route.requiredParams,
            pattern: route.pattern,
          };
        }
        url = url.replace(`{${param}}`, value);
      }
    }

    // Add optional params as query string
    if (args.params) {
      const optionalParams = Object.entries(args.params)
        .filter(([key]) => !route.requiredParams?.includes(key))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      if (optionalParams.length > 0) {
        url += `?${optionalParams.join('&')}`;
      }
    }

    return {
      found: true,
      feature,
      description: route.description,
      url,
      fullUrl: `https://openaid.example.com${url}`, // Placeholder domain
      requiredParams: route.requiredParams || [],
      providedParams: args.params || {},
    };
  }

  /**
   * Lấy nhiều link cùng lúc (dùng cho hướng dẫn quy trình)
   */
  getMultipleLinks(features: string[], commonParams?: Record<string, string>): any[] {
    return features.map(f => this.getFeatureLink({ feature: f, params: commonParams }));
  }

  /**
   * Lấy danh sách tất cả tính năng có sẵn
   */
  getAllFeatures(): any[] {
    return Object.entries(this.featureRoutes).map(([key, value]) => ({
      feature: key,
      description: value.description,
      pattern: value.pattern,
      requiredParams: value.requiredParams || [],
    }));
  }
}

// Predefined link groups cho các quy trình phổ biến
export const LINK_GROUPS = {
  donorFlow: [
    'events',
    'event-detail', // cần eventId
    'donate', // cần eventId
    'track-detail', // cần trackingId (sau khi donate)
    'my-donations',
  ],
  volunteerFlow: [
    'events',
    'event-detail', // cần eventId
    'volunteer-apply', // cần eventId
    'my-activities',
  ],
  organizerEventFlow: [
    'organizer-dashboard',
    'organizer-events',
    'organizer-events-new',
    'organizer-event-detail', // cần eventId
    'organizer-volunteers',
    'organizer-donations',
    'organizer-inventory',
    'organizer-batches',
    'organizer-trips',
    'organizer-transparency',
  ],
  organizerBatchFlow: [
    'organizer-donations',
    'organizer-batches',
    'organizer-batch-detail', // cần batchId
  ],
  organizerTripFlow: [
    'organizer-batches',
    'organizer-trips',
    'organizer-trip-detail', // cần tripId
  ],
  transparencyFlow: [
    'track',
    'track-detail', // cần trackingId
    'organizer-transparency',
  ],
};