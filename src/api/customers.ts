import { httpDelete, httpGet, httpPatch, httpPost } from "./client";
import type {
  Customer,
  CustomerCreateRequest,
  CustomerListParams,
  CustomerUpdateRequest,
} from "@/types/customer";

export const customersApi = {
  list(params: CustomerListParams = {}): Promise<Customer[]> {
    return httpGet<Customer[]>("/customers", { ...params });
  },

  create(payload: CustomerCreateRequest): Promise<Customer> {
    return httpPost<Customer>("/customers", payload);
  },

  update(customerId: number, payload: CustomerUpdateRequest): Promise<Customer> {
    return httpPatch<Customer>(`/customers/${customerId}`, payload);
  },

  remove(customerId: number): Promise<void> {
    return httpDelete<void>(`/customers/${customerId}`);
  },
};
