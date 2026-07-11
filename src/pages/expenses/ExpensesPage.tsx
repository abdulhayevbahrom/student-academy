import { useMemo, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tooltip,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Edit3, Plus, ReceiptText, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import {
  Expense,
  ExpenseFilters,
  ExpensePayload,
  PaymentMethod,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
  useUpdateExpenseMutation,
} from '../../services/api';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

type ExpenseFormValues = Omit<ExpensePayload, 'spentAt'> & {
  spentAt?: Dayjs;
};

const paymentMethodOptions: { label: string; value: PaymentMethod }[] = [
  { label: 'Naqd', value: 'cash' },
  { label: 'Click', value: 'click' },
  { label: 'Bank', value: 'bank_transfer' },
];

const defaultValues: ExpenseFormValues = {
  name: '',
  category: '',
  method: 'cash',
  amount: 0,
  note: '',
};

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('uz-UZ').format(value || 0)} so'm`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string; error?: string } }).data;
    return data?.error || data?.message || fallback;
  }

  return fallback;
}

export default function ExpensesPage() {
  const [form] = Form.useForm<ExpenseFormValues>();
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: filters.search?.trim() || undefined,
      dateFrom: dateRange?.[0]?.startOf('day').toISOString(),
      dateTo: dateRange?.[1]?.endOf('day').toISOString(),
      page,
      limit,
    }),
    [dateRange, filters, limit, page],
  );

  const { data: expensesResponse, isError, isFetching } = useGetExpensesQuery(queryFilters);
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();

  const expenses = expensesResponse?.data || [];
  const pagination = expensesResponse?.pagination;
  const summary = expensesResponse?.summary;
  const categoryOptions = (expensesResponse?.categories || []).map((value) => ({ label: value, value }));
  const isSaving = isCreating || isUpdating;

  function openCreateModal() {
    setEditingExpense(null);
    form.resetFields();
    form.setFieldsValue(defaultValues);
    setModalOpen(true);
  }

  function openEditModal(expense: Expense) {
    setEditingExpense(expense);
    form.setFieldsValue({
      name: expense.name,
      category: expense.category,
      method: expense.method,
      amount: expense.amount,
      spentAt: dayjs(expense.spentAt),
      note: expense.note || '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingExpense(null);
    form.resetFields();
  }

  async function handleSubmit(values: ExpenseFormValues) {
    const payload: ExpensePayload = {
      ...values,
      spentAt: editingExpense ? editingExpense.spentAt : dayjs().toISOString(),
      note: values.note?.trim() || '',
    };

    try {
      if (editingExpense) {
        await updateExpense({ id: editingExpense.id, body: payload }).unwrap();
        message.success('Xarajat yangilandi');
      } else {
        await createExpense(payload).unwrap();
        message.success("Xarajat qo'shildi");
      }

      closeModal();
    } catch (error) {
      message.error(getErrorMessage(error, "Xarajatni saqlab bo'lmadi"));
    }
  }

  function confirmDelete(expense: Expense) {
    Modal.confirm({
      title: "Xarajatni o'chirish",
      content: `"${expense.name}" xarajati o'chiriladi. Davom etasizmi?`,
      okText: "O'chirish",
      cancelText: 'Bekor qilish',
      okButtonProps: { danger: true, loading: isDeleting },
      async onOk() {
        try {
          await deleteExpense(expense.id).unwrap();
          message.success("Xarajat o'chirildi");
        } catch (error) {
          message.error(getErrorMessage(error, "Xarajatni o'chirib bo'lmadi"));
        }
      },
    });
  }

  function clearFilters() {
    setFilters({});
    setDateRange(null);
    setPage(1);
    setFiltersOpen(false);
  }

  return (
    <section className="page expenses-page">
      {isError ? <Alert className="page-alert" type="error" message="Xarajatlar ma'lumotini yuklab bo'lmadi." showIcon /> : null}

      <div className="expenses-panel">
        <div className="expenses-toolbar">
          <Input
            className="expenses-search"
            allowClear
            prefix={<Search size={16} />}
            placeholder="Nomi, kategoriya yoki izoh bo'yicha qidirish"
            value={filters.search}
            onChange={(event) => {
              setPage(1);
              setFilters((previous) => ({ ...previous, search: event.target.value }));
            }}
          />
          <Button
            className="expenses-filter-toggle"
            icon={<SlidersHorizontal size={16} />}
            aria-label="Filterlarni ko'rsatish"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(true)}
          >
            <span className="expenses-filter-label">Filterlar</span>
          </Button>
          <Select
            className="expenses-category-filter"
            allowClear
            showSearch
            placeholder="Kategoriya"
            options={categoryOptions}
            value={filters.category}
            onChange={(category) => {
              setPage(1);
              setFilters((previous) => ({ ...previous, category }));
            }}
          />
          <Select
            className="expenses-method-filter"
            allowClear
            placeholder="To'lov turi"
            options={paymentMethodOptions}
            value={filters.method}
            onChange={(method) => {
              setPage(1);
              setFilters((previous) => ({ ...previous, method }));
            }}
          />
          <RangePicker
            className="expenses-date-filter"
            popupClassName="mobile-range-picker-dropdown"
            inputReadOnly
            value={dateRange}
            format="DD.MM.YYYY"
            placeholder={['Boshlanish sana', 'Tugash sana']}
            onChange={(dates) => {
              setPage(1);
              setDateRange(dates ? [dates[0], dates[1]] : null);
            }}
          />
          <Button className="expenses-clear-button" icon={<X size={16} />} onClick={clearFilters}>
            Tozalash
          </Button>
          <Button className="expenses-create-button" type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
            <span className="expenses-create-label">Xarajat qo'shish</span>
          </Button>
        </div>

        <div className="expense-stats">
          <div className="expense-stat expense-stat-total">
            <span>Jami xarajat</span>
            <strong>{formatMoney(summary?.totalAmount || 0)}</strong>
          </div>
          {paymentMethodOptions.map((method) => (
            <div className={`expense-stat expense-stat-${method.value}`} key={method.value}>
              <span>{method.label}</span>
              <strong>{formatMoney(summary?.totalsByMethod[method.value] || 0)}</strong>
            </div>
          ))}
        </div>

        <Table
          className="expenses-table"
          rowKey="id"
          size="small"
          loading={isFetching}
          dataSource={expenses}
          scroll={{ x: 1180 }}
          locale={{ emptyText: "Xarajatlar topilmadi" }}
          pagination={{
            current: pagination?.page || page,
            pageSize: pagination?.limit || limit,
            total: pagination?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            onChange: (nextPage, nextLimit) => {
              setPage(nextLimit !== limit ? 1 : nextPage);
              setLimit(nextLimit);
            },
          }}
          columns={[
            {
              title: 'Nomi',
              dataIndex: 'name',
              width: 210,
              render: (value) => (
                <div className="expense-name-cell">
                  <span className="expense-row-icon"><ReceiptText size={16} /></span>
                  <strong>{value}</strong>
                </div>
              ),
            },
            { title: 'Kategoriya', dataIndex: 'category', width: 150 },
            {
              title: "To'lov turi",
              dataIndex: 'method',
              width: 130,
              render: (method: PaymentMethod) => paymentMethodOptions.find((option) => option.value === method)?.label || method,
            },
            {
              title: 'Summasi',
              dataIndex: 'amount',
              width: 150,
              render: (amount) => <strong>{formatMoney(amount)}</strong>,
            },
            {
              title: 'Sana',
              dataIndex: 'spentAt',
              width: 170,
              render: (value) => dayjs(value).format('DD.MM.YYYY HH:mm'),
            },
            { title: 'Kiritgan xodim', dataIndex: 'createdByName', width: 180 },
            {
              title: 'Izoh',
              dataIndex: 'note',
              ellipsis: true,
              render: (value) => value || '-',
            },
            {
              title: 'Amallar',
              width: 120,
              fixed: 'right',
              render: (_value, record: Expense) => (
                <Space>
                  <Tooltip title="Tahrirlash">
                    <Button
                      className="action-edit-button"
                      size="small"
                      icon={<Edit3 size={17} />}
                      onClick={() => openEditModal(record)}
                    />
                  </Tooltip>
                  <Tooltip title="O'chirish">
                    <Button size="small" danger icon={<Trash2 size={17} />} onClick={() => confirmDelete(record)} />
                  </Tooltip>
                </Space>
              ),
            },
          ]}
        />

        <div className="expenses-mobile-list">
          {expenses.map((expense) => (
            <article className="expense-mobile-card" key={expense.id}>
              <div className="expense-mobile-heading">
                <span className="expense-row-icon"><ReceiptText size={16} /></span>
                <div>
                  <strong>{expense.name}</strong>
                  <span>{expense.category}</span>
                </div>
                <b>{formatMoney(expense.amount)}</b>
              </div>
              <div className="expense-mobile-details">
                <span>To'lov turi</span>
                <strong>{paymentMethodOptions.find((option) => option.value === expense.method)?.label || expense.method}</strong>
                <span>Sana</span>
                <strong>{dayjs(expense.spentAt).format('DD.MM.YYYY HH:mm')}</strong>
                <span>Kiritgan xodim</span>
                <strong>{expense.createdByName || '-'}</strong>
              </div>
              {expense.note ? <p className="expense-mobile-note">{expense.note}</p> : null}
              <div className="expense-mobile-actions">
                <Tooltip title="Tahrirlash">
                  <Button className="expense-mobile-edit-button" size="small" aria-label="Tahrirlash" icon={<Edit3 size={16} />} onClick={() => openEditModal(expense)} />
                </Tooltip>
                <Tooltip title="O'chirish">
                  <Button size="small" danger aria-label="O'chirish" icon={<Trash2 size={16} />} onClick={() => confirmDelete(expense)} />
                </Tooltip>
              </div>
            </article>
          ))}
          {!isFetching && !expenses.length ? <div className="expenses-mobile-empty">Xarajatlar topilmadi</div> : null}
          {(pagination?.total || 0) > 0 ? (
            <Pagination
              className="expenses-mobile-pagination"
              current={pagination?.page || page}
              pageSize={pagination?.limit || limit}
              total={pagination?.total || 0}
              showSizeChanger
              pageSizeOptions={[10, 20, 50]}
              onChange={(nextPage, nextLimit) => {
                setPage(nextLimit !== limit ? 1 : nextPage);
                setLimit(nextLimit);
              }}
            />
          ) : null}
        </div>
      </div>

      <Modal
        className="expense-filters-modal"
        title="Xarajatlarni filtrlash"
        open={filtersOpen}
        onCancel={() => setFiltersOpen(false)}
        footer={(
          <Space>
            <Button onClick={clearFilters}>Tozalash</Button>
            <Button type="primary" onClick={() => setFiltersOpen(false)}>Tayyor</Button>
          </Space>
        )}
      >
        <div className="expense-filters-modal-fields">
          <Select
            allowClear
            showSearch
            placeholder="Kategoriya"
            options={categoryOptions}
            value={filters.category}
            onChange={(category) => {
              setPage(1);
              setFilters((previous) => ({ ...previous, category }));
            }}
          />
          <Select
            allowClear
            placeholder="To'lov turi"
            options={paymentMethodOptions}
            value={filters.method}
            onChange={(method) => {
              setPage(1);
              setFilters((previous) => ({ ...previous, method }));
            }}
          />
          <RangePicker
            popupClassName="mobile-range-picker-dropdown"
            inputReadOnly
            value={dateRange}
            format="DD.MM.YYYY"
            placeholder={['Boshlanish sana', 'Tugash sana']}
            onChange={(dates) => {
              setPage(1);
              setDateRange(dates ? [dates[0], dates[1]] : null);
            }}
          />
        </div>
      </Modal>

      <Modal
        className="expense-modal"
        title={editingExpense ? 'Xarajatni tahrirlash' : "Xarajat qo'shish"}
        width={720}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" initialValues={defaultValues} onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Nomi"
            rules={[
              { required: true, message: 'Xarajat nomini kiriting' },
              { min: 2, message: 'Kamida 2 ta belgi kiriting' },
            ]}
          >
            <Input placeholder="Masalan: Oziq-ovqat xarajati" />
          </Form.Item>

          <Form.Item name="category" label="Kategoriya" rules={[{ required: true, message: 'Kategoriyani kiriting' }]}>
            <AutoComplete
              options={categoryOptions}
              placeholder="Yangi kategoriya yozing"
              filterOption={(inputValue, option) =>
                String(option?.value || '').toLocaleLowerCase('uz').includes(inputValue.toLocaleLowerCase('uz'))
              }
            />
          </Form.Item>

          <Form.Item name="method" label="To'lov turi" rules={[{ required: true }]}>
            <PaymentMethodSelector />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Summasi"
            rules={[
              { required: true, message: 'Summani kiriting' },
              { type: 'number', min: 1, message: 'Summa 1 dan katta bo‘lishi kerak' },
            ]}
          >
            <InputNumber
              className="full-width"
              min={1}
              step={1000}
              placeholder="Masalan: 1 250 000"
              formatter={(value) => new Intl.NumberFormat('uz-UZ').format(Number(value || 0))}
              parser={(value) => Number(value?.replace(/[^\d]/g, '') || 0)}
            />
          </Form.Item>

          <Form.Item name="note" label="Izoh">
            <TextArea rows={4} maxLength={500} showCount placeholder="Qo'shimcha ma'lumot" />
          </Form.Item>

          <div className="expense-form-actions">
            <Button onClick={closeModal}>Bekor qilish</Button>
            <Button type="primary" htmlType="submit" loading={isSaving}>
              Saqlash
            </Button>
          </div>
        </Form>
      </Modal>
    </section>
  );
}
