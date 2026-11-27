/**
 * OpenAid Knowledge Base - RAG Retrieval Mechanism
 *
 * Giải pháp đơn giản, không cần vector DB:
 * - Load tất cả file .md tại startup
 * - Chunking theo heading (##, ###)
 * - Keyword search (TF-IDF inspired) + fuzzy matching
 * - Trả về top-k chunks liên quan nhất
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface KnowledgeChunk {
  id: string;
  sourceFile: string;
  title: string;
  headingPath: string[];  // e.g., ['## 3. Quy trình', '### 3.1 Bước 1']
  content: string;
  keywords: string[];
}

export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  score: number;
  matchedKeywords: string[];
}

class KnowledgeBase {
  private chunks: KnowledgeChunk[] = [];
  private initialized = false;
  private readonly knowledgeDir: string;

  constructor() {
    this.knowledgeDir = path.join(__dirname);
  }

  /**
   * Khởi tạo: đọc tất cả file .md, chunking, index
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const files = fs.readdirSync(this.knowledgeDir)
      .filter(f => f.endsWith('.md') && f !== 'index.ts');

    for (const file of files) {
      const filePath = path.join(this.knowledgeDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      this.chunkFile(file, content);
    }

    this.initialized = true;
    console.log(`[KnowledgeBase] Initialized with ${this.chunks.length} chunks from ${files.length} files`);
  }

  /**
   * Chia file markdown thành các chunk theo heading
   */
  private chunkFile(fileName: string, content: string): void {
    const lines = content.split('\n');
    let currentHeadingPath: string[] = [];
    let currentChunkLines: string[] = [];
    let currentTitle = fileName.replace('.md', '').replace(/-/g, ' ');
    let chunkIndex = 0;

    const flushChunk = () => {
      if (currentChunkLines.length > 0) {
        const chunkContent = currentChunkLines.join('\n').trim();
        if (chunkContent.length > 50) { // Chỉ lưu chunk có nội dung đủ dài
          const keywords = this.extractKeywords(chunkContent);
          this.chunks.push({
            id: `${fileName}::${chunkIndex++}`,
            sourceFile: fileName,
            title: currentTitle,
            headingPath: [...currentHeadingPath],
            content: chunkContent,
            keywords,
          });
        }
        currentChunkLines = [];
      }
    };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
      if (headingMatch) {
        flushChunk();
        const level = headingMatch[1].length;
        const headingText = headingMatch[2].trim();

        // Cập nhật heading path
        currentHeadingPath = currentHeadingPath.slice(0, level - 2);
        currentHeadingPath.push(line.trim());

        // Cập nhật title cho chunk con
        if (level === 2) {
          currentTitle = headingText;
        }
      } else {
        currentChunkLines.push(line);
      }
    }
    flushChunk();
  }

  /**
   * Trích xuất từ khóa từ nội dung (simple TF-IDF like)
   */
  private extractKeywords(text: string): string[] {
    // Loại bỏ markdown syntax
    const clean = text
      .replace(/[#*`\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();

    // Tách từ, lọc stop words tiếng Việt + tiếng Anh cơ bản
    const stopWords = new Set([
      'và', 'của', 'cho', 'trong', 'với', 'tại', 'từ', 'đến', 'được', 'là', 'có', 'không',
      'này', 'đó', 'các', 'một', 'những', 'đã', 'sẽ', 'đang', 'có thể', 'cần', 'phải',
      'the', 'and', 'for', 'in', 'with', 'to', 'from', 'of', 'a', 'an', 'is', 'are',
      'on', 'at', 'by', 'or', 'as', 'be', 'this', 'that', 'it', 'its', 'can', 'will'
    ]);

    const words = clean
      .split(/[\s\.,;:!?()\/\\-]+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .filter(w => !/^\d+$/.test(w)); // Loại bỏ số thuần túy

    // Đếm tần suất, lấy top 30
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([w]) => w);
  }

  /**
   * Tìm kiếm chunks liên quan đến query
   * @param query Câu hỏi của user
   * @param topK Số lượng kết quả trả về (mặc định 5)
   * @param minScore Ngưỡng điểm tối thiểu (0-1)
   */
  search(query: string, topK = 5, minScore = 0.1): KnowledgeSearchResult[] {
    if (!this.initialized) {
      throw new Error('KnowledgeBase not initialized. Call initialize() first.');
    }

    const queryKeywords = this.extractKeywords(query);
    if (queryKeywords.length === 0) return [];

    const results: KnowledgeSearchResult[] = [];

    for (const chunk of this.chunks) {
      const matched = queryKeywords.filter(qk =>
        chunk.keywords.some(ck => this.fuzzyMatch(qk, ck))
      );

      if (matched.length === 0) continue;

      // Tính điểm: số từ khóa match / tổng query keywords + bonus cho heading match
      let score = matched.length / queryKeywords.length;

      // Bonus nếu từ khóa xuất hiện trong heading path
      const headingText = chunk.headingPath.join(' ').toLowerCase();
      const headingMatches = queryKeywords.filter(qk => headingText.includes(qk));
      score += headingMatches.length * 0.15;

      // Bonus nếu chunk chứa từ khóa chính xác (không fuzzy)
      const exactMatches = queryKeywords.filter(qk => chunk.keywords.includes(qk));
      score += exactMatches.length * 0.1;

      // Normalize
      score = Math.min(score, 1.0);

      if (score >= minScore) {
        results.push({ chunk, score, matchedKeywords: matched });
      }
    }

    // Sắp xếp giảm dần theo score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  /**
   * Fuzzy matching đơn giản: prefix match hoặc contains
   */
  private fuzzyMatch(a: string, b: string): boolean {
    if (a === b) return true;
    if (a.length > 3 && b.length > 3) {
      // Prefix match 3 ký tự đầu
      if (a.startsWith(b.substring(0, 3)) || b.startsWith(a.substring(0, 3))) return true;
    }
    return a.includes(b) || b.includes(a);
  }

  /**
   * Lấy toàn bộ nội dung file (dùng khi cần context đầy đủ)
   */
  getFileContent(fileName: string): string | null {
    const filePath = path.join(this.knowledgeDir, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  }

  /**
   * Lấy danh sách file có sẵn
   */
  getAvailableFiles(): string[] {
    return fs.readdirSync(this.knowledgeDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
  }

  /**
   * Build context string từ search results để inject vào system prompt
   */
  buildContextString(results: KnowledgeSearchResult[], maxChars = 3000): string {
    if (results.length === 0) return '';

    let context = '\n--- THAM KHẢO TỪ KHO KIẾN THỨC OPENAID ---\n';
    let charCount = context.length;

    for (const { chunk, score, matchedKeywords } of results) {
      const header = `\n[${chunk.sourceFile}] ${chunk.headingPath.join(' > ') || chunk.title} (relevance: ${(score * 100).toFixed(0)}%)\n`;
      const content = chunk.content.substring(0, 800); // Giới hạn mỗi chunk

      if (charCount + header.length + content.length > maxChars) break;

      context += header + content + '\n';
      charCount += header.length + content.length;
    }

    context += '\n--- HẾT THAM KHẢO ---\n';
    return context;
  }
}

// Singleton instance
export const knowledgeBase = new KnowledgeBase();

/**
 * Khởi tạo knowledge base (gọi khi app startup)
 */
export async function initializeKnowledgeBase(): Promise<void> {
  await knowledgeBase.initialize();
}

/**
 * Tìm kiếm knowledge base và trả về context string
 */
export async function searchKnowledgeBase(query: string, topK = 5): Promise<string> {
  if (!knowledgeBase['initialized']) {
    await knowledgeBase.initialize();
  }
  const results = knowledgeBase.search(query, topK);
  return knowledgeBase.buildContextString(results);
}

export default knowledgeBase;