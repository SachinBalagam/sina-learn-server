declare namespace Express {
  interface Request {
    org?: {
      id: string;
      slug: string;
      [key: string]: any;
    };
    orgId?: string;
    user?: {
      id: string;
      organizationId?: string;
      [key: string]: any;
    };
  }
}
