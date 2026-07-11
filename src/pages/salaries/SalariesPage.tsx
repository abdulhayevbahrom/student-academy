import { useState } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Segmented, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import {
  EmployeeSalaryRecipient,
  EmployeeSalaryTransaction,
  useCreateEmployeeSalaryTransactionMutation,
  useGetEmployeeSalariesQuery,
} from '../../services/api';

type SalaryFormValues = {
  kind: EmployeeSalaryTransaction['kind'];
  amount: number;
  note?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    return (error as { data?: { message?: string } }).data?.message || fallback;
  }

  return fallback;
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString('uz-UZ')} so'm`;
}

function getBalanceColor(value?: number) {
  if (Number(value || 0) > 0) return 'green';
  if (Number(value || 0) < 0) return 'red';
  return 'default';
}

function SalaryBalanceTag({ value }: { value?: number }) {
  return <Tag color={getBalanceColor(value)}>{formatMoney(value)}</Tag>;
}

export default function SalariesPage() {
  const [salaryForm] = Form.useForm<SalaryFormValues>();
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState(dayjs().format('YYYY-MM'));
  const [salarySearch, setSalarySearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<EmployeeSalaryRecipient | null>(null);
  const [historyRecipient, setHistoryRecipient] = useState<EmployeeSalaryRecipient | null>(null);
  const selectedKind = Form.useWatch('kind', salaryForm) || 'advance';
  const { data: salaryData, isFetching: isSalaryFetching } = useGetEmployeeSalariesQuery({
    month: selectedSalaryMonth,
    search: salarySearch.trim() || undefined,
  });
  const [createSalaryTransaction, { isLoading: isSalarySaving }] = useCreateEmployeeSalaryTransactionMutation();
  const salaryRecipients = salaryData?.recipients || [];

  async function handleSalarySubmit(values: SalaryFormValues) {
    if (!selectedRecipient) return;

    try {
      await createSalaryTransaction({
        targetType: selectedRecipient.targetType,
        targetId: selectedRecipient.targetId,
        month: selectedSalaryMonth,
        kind: values.kind,
        amount: values.amount,
        note: values.note?.trim() || '',
      }).unwrap();
      message.success(
        values.kind === 'salary'
          ? 'Oylik hisoblandi'
          : values.kind === 'salary_payment'
            ? 'Oylik berildi'
            : 'Avans berildi',
      );
      closeSalaryModal();
    } catch (error) {
      message.error(getErrorMessage(error, 'Oylik amalini saqlab bo‘lmadi'));
    }
  }

  function openSalaryModal(recipient: EmployeeSalaryRecipient) {
    setSelectedRecipient(recipient);
    salaryForm.resetFields();
    salaryForm.setFieldsValue({ kind: 'advance', note: '' });
  }

  function closeSalaryModal() {
    setSelectedRecipient(null);
    salaryForm.resetFields();
  }

  const historyTransactions = (salaryData?.allTransactions || [])
    .filter(
      (transaction) =>
        historyRecipient
        && transaction.targetType === historyRecipient.targetType
        && transaction.targetId === historyRecipient.targetId
        && ['advance', 'salary_payment'].includes(transaction.kind),
    )
    .sort((first, second) => second.month.localeCompare(first.month) || dayjs(second.paidAt).valueOf() - dayjs(first.paidAt).valueOf());

  return (
    <section className="page">
      <div className="salary-page-grid">
        <div className="salary-toolbar">
          <Input
            allowClear
            prefix={<Search size={16} />}
            placeholder="Hodim yoki o'qituvchi qidirish"
            value={salarySearch}
            onChange={(event) => setSalarySearch(event.target.value)}
          />
          <DatePicker
            picker="month"
            value={dayjs(`${selectedSalaryMonth}-01`)}
            format="YYYY-MM"
            allowClear={false}
            onChange={(value) => {
              if (value) setSelectedSalaryMonth(value.format('YYYY-MM'));
            }}
          />
        </div>

        <div className="salary-summary-grid">
          <div className="payments-stat">
            <span>Shu oy oyligi</span>
            <strong>{formatMoney(salaryData?.summary.monthSalaryAmount)}</strong>
          </div>
          <div className="payments-stat">
            <span>Olgan avans</span>
            <strong>{formatMoney(salaryData?.summary.monthAdvanceAmount)}</strong>
          </div>
          <div className="payments-stat">
            <span>Olgan oyligi</span>
            <strong>{formatMoney(salaryData?.summary.monthPaidSalaryAmount)}</strong>
          </div>
          <div className="payments-stat">
            <span>Olishi kerak</span>
            <strong>{formatMoney(salaryData?.summary.totalReceivableAmount)}</strong>
          </div>
        </div>

        <Table
          className="salary-table salary-recipients-table"
          rowKey={(record) => `${record.targetType}-${record.targetId}`}
          loading={isSalaryFetching}
          dataSource={salaryRecipients}
          pagination={false}
          columns={[
            {
              title: 'Hodim',
              width: 210,
              render: (_value, record) => (
                <div className="stacked-cell">
                  <span>{record.fullName}</span>
                  <small>
                    {record.role}
                    {record.role === "O'qituvchi" && record.salaryType === 'percentage' ? ` | ${record.salaryPercentage}%` : ''}
                  </small>
                </div>
              ),
            },
            { title: 'Oylik', dataIndex: ['month', 'salaryAmount'], render: formatMoney },
            { title: 'Avans', dataIndex: ['month', 'advanceAmount'], render: formatMoney },
            { title: 'Berildi', dataIndex: ['month', 'paidSalaryAmount'], render: formatMoney },
            { title: 'Oy haqi', dataIndex: ['month', 'balance'], render: (value) => <SalaryBalanceTag value={value} /> },
            { title: 'Qoldiq', dataIndex: ['total', 'receivableAmount'], render: (value) => <SalaryBalanceTag value={value} /> },
            {
              title: "To'lov foizi",
              render: (_value, record) =>
                record.paymentStats ? (
                  <div className="stacked-cell">
                    <span>{record.paymentStats.paymentPercentage}%</span>
                    <small>
                      {formatMoney(record.paymentStats.paidAmount)} / {formatMoney(record.paymentStats.chargedAmount)}
                    </small>
                    {record.salaryType === 'percentage' ? <small>{formatMoney(record.paymentStats.salaryFromPercentage)}</small> : null}
                  </div>
                ) : (
                  <span className="muted-text">-</span>
                ),
            },
            {
              title: 'Amal',
              width: 210,
              render: (_value, record) => (
                <div className="salary-row-actions">
                  <Button onClick={() => setHistoryRecipient(record)}>Tarix</Button>
                  <Button type="primary" onClick={() => openSalaryModal(record)}>
                    Pul berish
                  </Button>
                </div>
              ),
            },
          ]}
        />

        <div className="salary-recipients-mobile-list">
          {salaryRecipients.map((recipient) => (
            <article className="salary-recipient-mobile-card" key={`${recipient.targetType}-${recipient.targetId}`}>
              <div className="salary-recipient-mobile-heading">
                <div>
                  <strong>{recipient.fullName}</strong>
                  <span>{recipient.role}{recipient.role === "O'qituvchi" && recipient.salaryType === 'percentage' ? ` | ${recipient.salaryPercentage}%` : ''}</span>
                </div>
                <SalaryBalanceTag value={recipient.month.balance} />
              </div>
              <div className="salary-recipient-mobile-details">
                <span>Oylik</span><strong>{formatMoney(recipient.month.salaryAmount)}</strong>
                <span>Avans</span><strong>{formatMoney(recipient.month.advanceAmount)}</strong>
                <span>Berildi</span><strong>{formatMoney(recipient.month.paidSalaryAmount)}</strong>
                <span>Qoldiq</span><strong><SalaryBalanceTag value={recipient.total.receivableAmount} /></strong>
                {recipient.paymentStats ? <><span>To'lov foizi</span><strong>{recipient.paymentStats.paymentPercentage}%</strong></> : null}
              </div>
              <div className="salary-recipient-mobile-actions">
                <Button onClick={() => setHistoryRecipient(recipient)}>Tarix</Button>
                <Button type="primary" onClick={() => openSalaryModal(recipient)}>Pul berish</Button>
              </div>
            </article>
          ))}
          {!isSalaryFetching && !salaryRecipients.length ? <div className="salary-mobile-empty">Ma'lumot topilmadi</div> : null}
        </div>

        <Table
          className="salary-transactions-table"
          rowKey="id"
          size="small"
          dataSource={salaryData?.transactions || []}
          pagination={false}
          scroll={{ x: 760 }}
          columns={[
            { title: 'Sana', dataIndex: 'paidAt', render: (value) => dayjs(value).format('DD.MM.YYYY HH:mm') },
            {
              title: 'Hodim',
              render: (_value, record) => {
                const recipient = salaryRecipients.find(
                  (item) => item.targetType === record.targetType && item.targetId === record.targetId,
                );

                return recipient ? recipient.fullName : '-';
              },
            },
            {
              title: 'Amal',
              dataIndex: 'kind',
              render: (value) => {
                const labels = {
                  salary: 'Oylik hisoblandi',
                  advance: 'Avans',
                  salary_payment: 'Oylik berildi',
                } as const;

                return (
                  <Tag color={value === 'salary' ? 'green' : value === 'salary_payment' ? 'blue' : 'orange'}>
                    {labels[value as keyof typeof labels]}
                  </Tag>
                );
              },
            },
            { title: 'Summa', dataIndex: 'amount', render: formatMoney },
            { title: 'Izoh', dataIndex: 'note', render: (value) => value || '-' },
          ]}
        />

        <div className="salary-transactions-mobile-list">
          {(salaryData?.transactions || []).map((transaction) => {
            const recipient = salaryRecipients.find(
              (item) => item.targetType === transaction.targetType && item.targetId === transaction.targetId,
            );
            const labels = { salary: 'Oylik hisoblandi', advance: 'Avans', salary_payment: 'Oylik berildi' } as const;

            return (
              <article className="salary-transaction-mobile-card" key={transaction.id}>
                <div className="salary-transaction-mobile-heading">
                  <strong>{recipient?.fullName || '-'}</strong>
                  <Tag color={transaction.kind === 'salary' ? 'green' : transaction.kind === 'salary_payment' ? 'blue' : 'orange'}>
                    {labels[transaction.kind]}
                  </Tag>
                </div>
                <div className="salary-transaction-mobile-details">
                  <span>Sana</span><strong>{dayjs(transaction.paidAt).format('DD.MM.YYYY HH:mm')}</strong>
                  <span>Summa</span><strong>{formatMoney(transaction.amount)}</strong>
                  <span>Izoh</span><strong>{transaction.note || '-'}</strong>
                </div>
              </article>
            );
          })}
        </div>

        <Modal
          title={selectedRecipient ? `${selectedRecipient.fullName} - pul berish` : 'Pul berish'}
          open={Boolean(selectedRecipient)}
          onCancel={closeSalaryModal}
          footer={null}
          destroyOnHidden
        >
          <Form form={salaryForm} layout="vertical" initialValues={{ kind: 'advance' }} onFinish={handleSalarySubmit}>
            <Form.Item name="kind" label="Amal" rules={[{ required: true }]}>
              <Segmented
                block
                className="salary-kind-segmented"
                value={selectedKind}
                onChange={(value) => salaryForm.setFieldValue('kind', value)}
                options={[
                  { label: 'Avans', value: 'advance' },
                  { label: 'Oylik', value: 'salary_payment' },
                ]}
              />
            </Form.Item>
            <Form.Item name="amount" label="Summa" rules={[{ required: true, message: 'Summani kiriting' }]}>
              <InputNumber min={1} className="full-width" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} />
            </Form.Item>
            <Form.Item name="note" label="Izoh">
              <Input placeholder="Masalan: iyun oyligi" />
            </Form.Item>
            <div className="drawer-form-actions">
              <Button onClick={closeSalaryModal}>Bekor qilish</Button>
              <Button type="primary" htmlType="submit" loading={isSalarySaving}>
                Saqlash
              </Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={historyRecipient ? `${historyRecipient.fullName} - tarix` : 'Tarix'}
          open={Boolean(historyRecipient)}
          onCancel={() => setHistoryRecipient(null)}
          footer={[
            <Button key="close" type="primary" onClick={() => setHistoryRecipient(null)}>
              Yopish
            </Button>,
          ]}
          width="min(820px, 100vw)"
        >
          <Table
            className="salary-history-table"
            rowKey="id"
            size="small"
            dataSource={historyTransactions}
            pagination={false}
            columns={[
              { title: 'Oy', dataIndex: 'month' },
              { title: 'Sana', dataIndex: 'paidAt', render: (value) => dayjs(value).format('DD.MM.YYYY HH:mm') },
              {
                title: 'Amal',
                dataIndex: 'kind',
                render: (value) => (
                  <Tag color={value === 'salary_payment' ? 'blue' : 'orange'}>
                    {value === 'salary_payment' ? 'Oylik berildi' : 'Avans'}
                  </Tag>
                ),
              },
              { title: 'Summa', dataIndex: 'amount', render: formatMoney },
              { title: 'Izoh', dataIndex: 'note', render: (value) => value || '-' },
            ]}
          />
          <div className="salary-history-mobile-list">
            {historyTransactions.map((transaction) => (
              <article className="salary-history-mobile-card" key={transaction.id}>
                <div className="salary-history-mobile-heading">
                  <strong>{transaction.month}</strong>
                  <Tag color={transaction.kind === 'salary_payment' ? 'blue' : 'orange'}>
                    {transaction.kind === 'salary_payment' ? 'Oylik berildi' : 'Avans'}
                  </Tag>
                </div>
                <div className="salary-history-mobile-details">
                  <span>Sana</span><strong>{dayjs(transaction.paidAt).format('DD.MM.YYYY HH:mm')}</strong>
                  <span>Summa</span><strong>{formatMoney(transaction.amount)}</strong>
                  <span>Izoh</span><strong>{transaction.note || '-'}</strong>
                </div>
              </article>
            ))}
            {!historyTransactions.length ? <div className="salary-mobile-empty">Tarix topilmadi</div> : null}
          </div>
        </Modal>
      </div>
    </section>
  );
}
