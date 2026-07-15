import { useState } from 'react';
import { Alert, Button, Card, Empty, Select, Space, Spin, Table, Tag, Typography, message } from 'antd';
import { Minus, Plus } from 'lucide-react';
import { StudentPoint, StudentPointGroup, useAdjustStudentPointsMutation, useGetGroupStudentPointsQuery, useGetStudentPointGroupsQuery } from '../../services/api';

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
  const { data: groupsResponse, isFetching: isGroupsFetching } = useGetStudentPointGroupsQuery();
  const { data, isLoading: isPointsLoading } = useGetGroupStudentPointsQuery(groupId!, { skip: !groupId });
  const [adjustPoints] = useAdjustStudentPointsMutation();
  const groups = groupsResponse?.data || [];

  async function adjust(student: StudentPoint, type: 'plus' | 'minus') {
    if (!groupId) return;
    const actionKey = `${student.id}:${type}`;
    setPendingAction(actionKey);
    try {
      await adjustPoints({ groupId, studentId: student.id, type, delta: 1 }).unwrap();
      message.success(`${student.fullName} uchun ${type === 'plus' ? 'plus' : 'minus'} ball yangilandi`);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
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
            onChange={setGroupId}
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
              {
                title: 'Ball berish', align: 'center', render: (_value, row) => (
                  <Space>
                    <Button aria-label="Plus berish" type="primary" icon={<Plus size={16} />} loading={pendingAction === `${row.id}:plus`} onClick={() => adjust(row, 'plus')} />
                    <Button aria-label="Minus berish" danger icon={<Minus size={16} />} loading={pendingAction === `${row.id}:minus`} onClick={() => adjust(row, 'minus')} />
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
