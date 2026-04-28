import { CustomerForm } from "../CustomerForm";
import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">고객 추가</h1>
      <CustomerForm submit={createCustomer} submitLabel="등록" />
    </div>
  );
}
