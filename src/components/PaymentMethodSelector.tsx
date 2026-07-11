import { Segmented } from 'antd';
import { PaymentMethod } from '../services/api';

const paymentMethodOptions: { label: string; value: PaymentMethod }[] = [
  { label: 'Naqd', value: 'cash' },
  { label: 'Click', value: 'click' },
  { label: 'Bank', value: 'bank_transfer' },
];

type PaymentMethodSelectorProps = {
  value?: PaymentMethod;
  onChange?: (value: PaymentMethod) => void;
};

export default function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <Segmented
      block
      className="payment-method-selector"
      options={paymentMethodOptions}
      value={value}
      onChange={(nextValue) => onChange?.(nextValue as PaymentMethod)}
    />
  );
}
