import type { AfendaAuthService } from "./afenda-auth.types";
import { ApiAfendaAuthService } from "./afenda-auth.api";
import { HttpAfendaAuthService } from "./afenda-auth.http";
import { MockAfendaAuthService } from "./afenda-auth.mock";

let service: AfendaAuthService | null = null;

export function getAfendaAuthService(): AfendaAuthService {
  if (service) return service;

  if (process.env.AUTH_BACKEND_URL) {
    const httpService = new HttpAfendaAuthService(
      process.env.AUTH_BACKEND_URL,
      process.env.AUTH_BACKEND_API_KEY,
    );
    service = httpService;
    return httpService;
  }

  if (process.env.MOCK_AUTH === "1") {
    service = new MockAfendaAuthService();
    return service;
  }

  service = new ApiAfendaAuthService();
  return service;
}
