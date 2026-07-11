import { DatePicker, Progress, Table, Tag } from 'antd';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import dayjs from 'dayjs';
import { ReactNode, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  GraduationCap,
  ReceiptText,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  DashboardActivity,
  DashboardGroupPerformance,
  PaymentMethod,
  useGetDashboardQuery,
} from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Legend, ChartTooltip);

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Naqd',
  bank_transfer: "Bank o'tkazma",
  click: 'Click',
};

const activityLabels: Record<DashboardActivity['type'], string> = {
  payment: "To'lov",
  expense: 'Xarajat',
  advance: 'Avans',
  salary_payment: 'Oylik',
};

const activityColors: Record<DashboardActivity['type'], string> = {
  payment: 'green',
  expense: 'red',
  advance: 'orange',
  salary_payment: 'blue',
};

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString('uz-UZ')} so'm`;
}

function formatNumber(value?: number) {
  return Number(value || 0).toLocaleString('uz-UZ');
}

function getPercent(value?: number, total?: number) {
  return Number(total || 0) > 0 ? Math.round((Number(value || 0) / Number(total)) * 1000) / 10 : 0;
}

function getChartMoneyLabel(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 100_000) / 10} mln`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1000)} ming`;
  return String(value);
}

function KpiCard({
  title,
  value,
  detail,
  tone,
  icon,
  loading,
}: {
  title: string;
  value: string;
  detail: string;
  tone: 'income' | 'expense' | 'payroll' | 'debt' | 'neutral' | 'success';
  icon: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className={`dashboard-kpi dashboard-kpi-${tone}`}>
      <div className="dashboard-kpi-title">
        <div className="dashboard-kpi-icon">{icon}</div>
        <span>{title}</span>
      </div>
      {loading ? (
        <div className="dashboard-kpi-loading" aria-label="Yuklanmoqda">
          <span className="dashboard-skeleton dashboard-skeleton-value" />
          <span className="dashboard-skeleton dashboard-skeleton-detail" />
        </div>
      ) : (
        <>
          <strong>{value}</strong>
          <small>{detail}</small>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const { data, isFetching } = useGetDashboardQuery({ month: selectedMonth });
  const summary = data?.summary;
  const isDashboardLoading = isFetching && !data;
  const selectedMonthLabel = dayjs(`${selectedMonth}-01`).format('MMMM YYYY');
  const paymentCoverage = getPercent(summary?.allocatedPaidAmount, summary?.chargedAmount);
  const netTone = Number(summary?.netAmount || 0) >= 0 ? 'success' : 'expense';
  const methodEntries = Object.entries(data?.payments.totalsByMethod || {}) as [PaymentMethod, number][];
  const totalStudents = data?.counts.students.total || 0;
  const trendItems = data?.dailyTrend || [];
  const chartData = {
    labels: trendItems.map((item) => item.day),
    datasets: [
      {
        label: 'Kirim',
        data: trendItems.map((item) => item.incomeAmount),
        borderColor: '#20c997',
        backgroundColor: 'rgba(32, 201, 151, 0.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: 'Chiqim',
        data: trendItems.map((item) => item.outflowAmount),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        tension: 0.35,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: 'Xarajat',
        data: trendItems.map((item) => item.expenseAmount),
        borderColor: '#ff4d4f',
        backgroundColor: 'rgba(255, 77, 79, 0.08)',
        tension: 0.35,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: '#aeb4c0',
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label(context: { dataset: { label?: string }; parsed: { y: number } }) {
            return `${context.dataset.label || ''}: ${formatMoney(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(48, 53, 64, 0.45)',
        },
        ticks: {
          color: '#aeb4c0',
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(48, 53, 64, 0.65)',
        },
        ticks: {
          color: '#aeb4c0',
          callback(value: string | number) {
            return getChartMoneyLabel(Number(value));
          },
        },
      },
    },
  };

  return (
    <section className="page dashboard-page">
      <div className="dashboard-toolbar">
        <DatePicker
          picker="month"
          value={dayjs(`${selectedMonth}-01`)}
          format="YYYY-MM"
          allowClear={false}
          onChange={(value) => {
            if (value) setSelectedMonth(value.format('YYYY-MM'));
          }}
        />
      </div>

      <div className="dashboard-kpi-grid">
        <KpiCard title="Bugungi tasdiqlangan kirim" value={formatMoney(data?.today.incomeAmount)} detail="Bugun tasdiqlangan kassa to'lovlari" tone="income" icon={<ArrowUpRight size={20} />} loading={isDashboardLoading} />
        <KpiCard title="Bugungi kiritilgan xarajat" value={formatMoney(data?.today.expenseAmount)} detail="Bugun xarajat sifatida kiritilgan summa" tone="expense" icon={<ReceiptText size={20} />} loading={isDashboardLoading} />
        <KpiCard title="Bugungi sof natija" value={formatMoney(data?.today.netAmount)} detail="Bugungi kirim - bugungi xarajat" tone={Number(data?.today.netAmount || 0) >= 0 ? 'success' : 'expense'} icon={<Banknote size={20} />} loading={isDashboardLoading} />
      </div>

      <div className="dashboard-kpi-grid">
        <KpiCard
          title="Tanlangan oy kirimi"
          value={formatMoney(summary?.incomeAmount)}
          detail={`${selectedMonthLabel} bo'yicha ${formatNumber(data?.payments.count)} ta to'lov`}
          tone="income"
          icon={<ArrowUpRight size={20} />}
          loading={isDashboardLoading}
        />
        <KpiCard
          title="Tanlangan oy xarajati"
          value={formatMoney(summary?.expenseAmount)}
          detail={`${selectedMonthLabel} bo'yicha ${formatNumber(data?.expenses.count)} ta xarajat`}
          tone="expense"
          icon={<ReceiptText size={20} />}
          loading={isDashboardLoading}
        />
        <KpiCard
          title="Tanlangan oy oylik to'lovi"
          value={formatMoney(summary?.payrollPaidAmount)}
          detail={`O'qituvchi va hodimlarga hisoblangan: ${formatMoney(summary?.salaryAccruedAmount)}`}
          tone="payroll"
          icon={<CircleDollarSign size={20} />}
          loading={isDashboardLoading}
        />
        <KpiCard
          title="Tanlangan oy sof natijasi"
          value={formatMoney(summary?.netAmount)}
          detail="Oy kirimi - oy xarajati - berilgan oylik"
          tone={netTone}
          icon={Number(summary?.netAmount || 0) >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
          loading={isDashboardLoading}
        />
        <KpiCard
          title="Tanlangan oy hisoblangan to'lovi"
          value={formatMoney(summary?.chargedAmount)}
          detail={`O'quvchilardan to'langan: ${formatMoney(summary?.allocatedPaidAmount)} (${paymentCoverage}%)`}
          tone="neutral"
          icon={<Banknote size={20} />}
          loading={isDashboardLoading}
        />
        <KpiCard
          title="O'quvchilar jami qarzi"
          value={formatMoney(summary?.totalDebtAmount)}
          detail={`Tanlangan oy qarzi: ${formatMoney(summary?.monthDebtAmount)}`}
          tone="debt"
          icon={<Wallet size={20} />}
          loading={isDashboardLoading}
        />
      </div>

      <div className="dashboard-masonry">
        <div className="dashboard-main-column">
          <div className="dashboard-panel dashboard-counts-panel">
            <div className="dashboard-panel-header">
              <h3>Markaz holati</h3>
            </div>
            <div className="dashboard-count-grid">
              <div>
                <div className="dashboard-count-title">
                  <UsersRound size={18} />
                  <span>O'quvchilar</span>
                </div>
                <strong>{formatNumber(totalStudents)}</strong>
                <small>
                  Faol {formatNumber(data?.counts.students.active)} | Pauza {formatNumber(data?.counts.students.paused)} | Qarz{' '}
                  {formatNumber(data?.counts.students.debt)}
                </small>
              </div>
              <div>
                <div className="dashboard-count-title">
                  <GraduationCap size={18} />
                  <span>Guruhlar</span>
                </div>
                <strong>{formatNumber(data?.counts.groups.total)}</strong>
                <small>
                  Faol {formatNumber(data?.counts.groups.active)} | Arxiv {formatNumber(data?.counts.groups.archived)}
                </small>
              </div>
              <div>
                <div className="dashboard-count-title">
                  <GraduationCap size={18} />
                  <span>O'qituvchilar</span>
                </div>
                <strong>{formatNumber(data?.counts.teachers.total)}</strong>
                <small>Faol {formatNumber(data?.counts.teachers.active)}</small>
              </div>
              <div>
                <div className="dashboard-count-title">
                  <UsersRound size={18} />
                  <span>Hodimlar</span>
                </div>
                <strong>{formatNumber(data?.counts.employees.total)}</strong>
                <small>Faol {formatNumber(data?.counts.employees.active)}</small>
              </div>
            </div>
          </div>

          <div className="dashboard-panel dashboard-groups-panel">
            <div className="dashboard-panel-header">
              <h3>Guruhlar to'lov holati</h3>
            </div>
            <Table
              rowKey="id"
              size="small"
              loading={isFetching}
              dataSource={data?.groupPerformance || []}
              pagination={false}
              columns={[
                {
                  title: 'Guruh',
                  render: (_value, record: DashboardGroupPerformance) => (
                    <div className="stacked-cell">
                      <span>{record.name}</span>
                      <small>{record.subject} | {record.teacherName}</small>
                    </div>
                  ),
                },
                { title: "O'quvchi", dataIndex: 'studentsCount', render: formatNumber },
                { title: 'Hisob', dataIndex: 'chargedAmount', render: formatMoney },
                { title: "To'landi", dataIndex: 'paidAmount', render: formatMoney },
                { title: 'Qarz', dataIndex: 'debtAmount', render: (value) => <Tag color={Number(value) > 0 ? 'red' : 'green'}>{formatMoney(value)}</Tag> },
                {
                  title: "Foiz",
                  dataIndex: 'paymentPercentage',
                  render: (value) => (
                    <div className="dashboard-progress-cell">
                      <Progress percent={Number(value || 0)} size="small" strokeColor="#3a86ff" trailColor="#303540" />
                    </div>
                  ),
                },
              ]}
            />
          </div>

          <div className="dashboard-panel dashboard-activities-panel">
            <div className="dashboard-panel-header">
              <h3>Oxirgi amallar</h3>
            </div>
            <Table
              rowKey={(record) => `${record.type}-${record.id}`}
              size="small"
              loading={isFetching}
              dataSource={data?.recentActivities || []}
              pagination={false}
              columns={[
                { title: 'Sana', dataIndex: 'date', render: (value) => dayjs(value).format('DD.MM.YYYY HH:mm') },
                {
                  title: 'Amal',
                  render: (_value, record: DashboardActivity) => (
                    <Tag color={activityColors[record.type]}>{activityLabels[record.type]}</Tag>
                  ),
                },
                {
                  title: 'Nomi',
                  render: (_value, record: DashboardActivity) => (
                    <div className="stacked-cell">
                      <span>{record.title}</span>
                      <small>{record.description || '-'}</small>
                    </div>
                  ),
                },
                { title: 'Summa', dataIndex: 'amount', render: formatMoney },
              ]}
            />
          </div>
        </div>

        <div className="dashboard-side-column">
          <div className="dashboard-panel dashboard-method-panel">
            <div className="dashboard-panel-header">
              <h3>To'lov usullari</h3>
            </div>
            <div className="dashboard-method-list">
              {methodEntries.map(([method, amount]) => (
                <div key={method}>
                  <div>
                    <span>{methodLabels[method]}</span>
                    <strong>{formatMoney(amount)}</strong>
                  </div>
                  <Progress
                    percent={getPercent(amount, data?.payments.totalAmount)}
                    showInfo={false}
                    strokeColor="#20c997"
                    trailColor="#303540"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-panel dashboard-debtors-panel">
            <div className="dashboard-panel-header">
              <h3>Eng katta qarzdorlar</h3>
            </div>
            <Table
              rowKey="studentId"
              size="small"
              loading={isFetching}
              dataSource={data?.topDebtors || []}
              pagination={false}
              columns={[
                {
                  title: "O'quvchi",
                  render: (_value, record) => (
                    <div className="stacked-cell">
                      <span>{record.fullName}</span>
                      <small>{record.groupName}</small>
                    </div>
                  ),
                },
                { title: 'Oy', dataIndex: 'monthsCount', render: formatNumber },
                { title: 'Qarz', dataIndex: 'totalDebt', render: (value) => <Tag color="red">{formatMoney(value)}</Tag> },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="dashboard-panel dashboard-chart-panel">
        <div className="dashboard-panel-header">
          <h3>Oy bo'yicha pul oqimi</h3>
        </div>
        <div className="dashboard-line-chart">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </section>
  );
}
