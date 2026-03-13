export interface IUser {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: "ADMIN" | "USER";
    createdAt: Date;
    updatedAt: Date;
 }