export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const okResponse = <T>(
  data: T,
  message = "Request processed successfully",
): ApiResponse<T> => ({
  success: true,
  message,
  data,
});
