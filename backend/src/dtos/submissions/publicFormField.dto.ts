export interface PublicFormFieldDTO {
  id: string;
  key: string;
  type: string;
  label: string;
  required: boolean;
  order: number;
  options?: any;
  validation?: any;
}