export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}
