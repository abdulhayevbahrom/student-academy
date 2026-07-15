import { useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Button, Card, Empty, InputNumber, Modal, Select, Space, Spin, Table, Tag, Typography, message } from 'antd';
import { History, Minus, Plus } from 'lucide-react';
import { StudentPoint, StudentPointGroup, useAdjustStudentPointsMutation, useGetGroupStudentPointsQuery, useGetStudentPointHistoryQuery, useGetStudentPointGroupsQuery } from '../../services/api';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string; error?: string } }).data;
    return data?.message || data?.error || 'Ballni yangilab bo‘lmadi';
  }
  return 'Ballni yangilab bo‘lmadi';
}

function groupLabel(group: StudentPointGroup) {
  return `${group.name} • ${group.subject}`;
}

export default function StudentPointsPage() {
  const [groupId, setGroupId] = useState<string>();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [historyStudent, setHistoryStudent] = useState<StudentPoint | null>(null);
  const [adjustment, setAdjustment] = useState<{ student: StudentPoint; type: 'plus' | 'minus' } | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(1);
  const { data: groupsResponse, isFetching: isGroupsFetching } = useGetStudentPointGroupsQuery();
  const { data, isLoading: isPointsLoading } = useGetGroupStudentPointsQuery(groupId!, { skip: !groupId });
  const { data: history, isLoading: isHistoryLoading } = useGetStudentPointHistoryQuery(
    { groupId: groupId || '', studentId: historyStudent?.id || '' },
    { skip: !groupId || !historyStudent },
  );
  const [adjustPoints] = useAdjustStudentPointsMutation();
  const groups = groupsResponse?.data || [];

  async function adjust() {
    if (!adjustment) return;
    const { student, type } = adjustment;
    if (!groupId) return;
    const actionKey = `${student.id}:${type}`;
    setPendingAction(actionKey);
    try {
      await adjustPoints({ groupId, studentId: student.id, type, delta: adjustmentAmount }).unwrap();
      message.success(`${student.fullName} uchun ${type === 'plus' ? 'plus' : 'minus'} ball yangilandi`);
      setAdjustment(null);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  function formatTotal(student: StudentPoint) {
    const total = student.plus - student.minus;
    return total > 0 ? `+${total}` : total < 0 ? `−${Math.abs(total)}` : '0';
  }

  function openAdjustment(student: StudentPoint, type: 'plus' | 'minus') {
    setAdjustmentAmount(1);
    setAdjustment({ student, type });
  }

  return (
    <div className="page-container">
      <Card
        bordered={false}
        title={(
          <Space wrap size="middle">
            <Typography.Text strong>Plus / Minus</Typography.Text>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Guruhni tanlang"
            loading={isGroupsFetching}
            value={groupId}
            onChange={(nextGroupId) => {
              setGroupId(nextGroupId);
              setHistoryStudent(null);
            }}
            style={{ minWidth: 280 }}
            options={groups.map((group) => ({ value: group.id, label: groupLabel(group) }))}
          />
          </Space>
        )}
      >
        {!groupId ? (
          <Alert type="info" showIcon message="Avval o‘zingizga biriktirilgan guruhni tanlang" />
        ) : isPointsLoading && !data ? (
          <div className="page-loading"><Spin size="large" /></div>
        ) : !data?.data.length ? (
          <Empty description="Bu guruhda faol o‘quvchilar yo‘q" />
        ) : (
          <Table<StudentPoint>
            rowKey="id"
            dataSource={data.data}
            pagination={false}
            scroll={{ x: 720 }}
            columns={[
              { title: 'O‘quvchi', dataIndex: 'fullName', render: (value, row) => <div><strong>{value}</strong><br /><small>{row.phone}</small></div> },
              { title: 'Plus', dataIndex: 'plus', align: 'center', render: (value) => <Tag color="green">{value}</Tag> },
              { title: 'Minus', dataIndex: 'minus', align: 'center', render: (value) => <Tag color="red">{value}</Tag> },
              { title: 'Jami', align: 'center', render: (_value, row) => <strong>{formatTotal(row)}</strong> },
              {
                title: 'Ball berish', align: 'center', render: (_value, row) => (
                  <Space>
                    <Button aria-label="Plus berish" type="primary" icon={<Plus size={16} />} loading={pendingAction === `${row.id}:plus`} onClick={() => openAdjustment(row, 'plus')} />
                    <Button aria-label="Minus berish" danger icon={<Minus size={16} />} loading={pendingAction === `${row.id}:minus`} onClick={() => openAdjustment(row, 'minus')} />
                  </Space>
                ),
              },
              { title: 'Tarix', align: 'center', render: (_value, row) => <Button aria-label="Ballar tarixi" icon={<History size={16} />} onClick={() => setHistoryStudent(row)}>Tarix</Button> },
            ]}
          />
        )}
      </Card>
      <Modal
        title={historyStudent ? `${historyStudent.fullName} — Plus / Minus tarixi` : 'Plus / Minus tarixi'}
        open={Boolean(historyStudent)}
        footer={null}
        width="min(720px, calc(100vw - 24px))"
        onCancel={() => setHistoryStudent(null)}
      >
        <Table
          rowKey="id"
          loading={isHistoryLoading}
          dataSource={history?.data || []}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: 'Ballar tarixi yo‘q' }}
          columns={[
            { title: 'Sana', dataIndex: 'createdAt', render: (value) => dayjs(value).format('DD.MM.YYYY HH:mm') },
            { title: 'Turi', dataIndex: 'type', render: (value) => <Tag color={value === 'plus' ? 'green' : 'red'}>{value === 'plus' ? 'Plus' : 'Minus'}</Tag> },
            { title: 'Miqdori', dataIndex: 'amount', align: 'center' },
          ]}
        />
      </Modal>
      <Modal
        title={adjustment ? `${adjustment.student.fullName}ga ${adjustment.type === 'plus' ? 'plus' : 'minus'} berish` : 'Ball berish'}
        open={Boolean(adjustment)}
        okText="Saqlash"
        cancelText="Bekor qilish"
        confirmLoading={Boolean(adjustment && pendingAction === `${adjustment.student.id}:${adjustment.type}`)}
        onOk={adjust}
        onCancel={() => setAdjustment(null)}
      >
        <Typography.Paragraph>Ball miqdorini kiriting:</Typography.Paragraph>
        <InputNumber min={1} precision={0} autoFocus value={adjustmentAmount} onChange={(value) => setAdjustmentAmount(Math.max(Number(value) || 1, 1))} />
      </Modal>
    </div>
  );
}
