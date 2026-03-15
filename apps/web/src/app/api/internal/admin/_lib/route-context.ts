export type AdminUserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export type AdminUserSessionRouteContext = {
  params: Promise<{
    userId: string;
    sessionId: string;
  }>;
};
