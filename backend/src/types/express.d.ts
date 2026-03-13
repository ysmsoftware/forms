import { File } from "multer";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
      id: string;
    }

    namespace Multer {
        interface File{}
    }
  }
}

export {}