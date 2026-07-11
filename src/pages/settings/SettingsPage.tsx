import { Button, Form, Input, Modal, Popconfirm, Spin, Table, Upload, message } from 'antd';
import { DoorOpen, ImagePlus, Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import BrandIdentity from '../../components/BrandIdentity';
import { BrandingSettings, UNIFY_BRAND } from '../../config/branding';
import {
  useGetBrandingSettingsQuery,
  useGetRoomsQuery,
  useUpdateBrandingSettingsMutation,
  useUpdateRoomsMutation,
  useUploadBrandLogoMutation,
} from '../../services/api';

type SettingsFormValues = {
  unify: { name: string; subtitle: string; receiptFooter?: string };
};

type RoomFormValues = {
  name: string;
};

export default function SettingsPage() {
  const [form] = Form.useForm<SettingsFormValues>();
  const [roomForm] = Form.useForm<RoomFormValues>();
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const { data, isLoading } = useGetBrandingSettingsQuery();
  const { data: roomsResponse, isLoading: isRoomsLoading } = useGetRoomsQuery();
  const [updateBranding, { isLoading: isSaving }] = useUpdateBrandingSettingsMutation();
  const [updateRooms, { isLoading: isRoomsSaving }] = useUpdateRoomsMutation();
  const [uploadLogo] = useUploadBrandLogoMutation();
  const settings: BrandingSettings = data || { unify: UNIFY_BRAND };
  const watchedBrand = Form.useWatch('unify', form);
  const previewBrand = {
    ...settings.unify,
    ...watchedBrand,
  };
  const rooms = roomsResponse?.data || [];

  useEffect(() => {
    form.setFieldsValue({
      unify: {
        name: settings.unify.name,
        subtitle: settings.unify.subtitle,
        receiptFooter: settings.unify.receiptFooter || "To'lovingiz uchun rahmat",
      },
    });
  }, [form, settings.unify.name, settings.unify.receiptFooter, settings.unify.subtitle]);

  async function handleSave(values: SettingsFormValues) {
    try {
      await updateBranding({
        unify: { ...values.unify, logoUrl: settings.unify.logoUrl },
      }).unwrap();
      message.success('Brending sozlamalari saqlandi');
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      message.error(apiError.data?.message || 'Sozlamalarni saqlab bo‘lmadi');
    }
  }

  function uploadProps() {
    return {
      accept: 'image/png,image/jpeg,image/webp',
      showUploadList: false,
      customRequest: async ({ file, onSuccess, onError }: { file: string | Blob; onSuccess?: (body: unknown) => void; onError?: (error: Error) => void }) => {
        if (!(file instanceof File)) return;

        try {
          const result = await uploadLogo({ brand: 'unify', file }).unwrap();
          onSuccess?.(result);
          message.success('Logo yuklandi');
        } catch (error) {
          const apiError = error as { data?: { message?: string } };
          const uploadError = new Error(apiError.data?.message || 'Logoni yuklab bo‘lmadi');
          onError?.(uploadError);
          message.error(uploadError.message);
        }
      },
    };
  }

  function openRoomModal() {
    roomForm.resetFields();
    setRoomModalOpen(true);
  }

  async function handleAddRoom(values: RoomFormValues) {
    const roomName = values.name.trim();

    if (!roomName) return;

    if (rooms.some((room) => room.toLowerCase() === roomName.toLowerCase())) {
      message.warning("Bu xona ro'yxatda bor");
      return;
    }

    try {
      await updateRooms({ rooms: [...rooms, roomName] }).unwrap();
      message.success("Xona qo'shildi");
      setRoomModalOpen(false);
      roomForm.resetFields();
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      message.error(apiError.data?.message || "Xonani qo'shib bo'lmadi");
    }
  }

  async function handleDeleteRoom(roomName: string) {
    try {
      await updateRooms({ rooms: rooms.filter((room) => room !== roomName) }).unwrap();
      message.success("Xona o'chirildi");
    } catch (error) {
      const apiError = error as { data?: { message?: string } };
      message.error(apiError.data?.message || "Xonani o'chirib bo'lmadi");
    }
  }

  if (isLoading || isRoomsLoading) return <Spin />;

  return (
    <section className="settings-page">
      <div className="settings-shell">
        <aside className="settings-preview-panel">
          <span className="settings-eyebrow">To'lov cheki</span>
          <div className="settings-brand-preview">
            <BrandIdentity brand={previewBrand} variant="login" />
          </div>
          <div className="settings-receipt-preview">
            <div className="receipt-row">
              <span>Chek</span>
              <strong>#A1B2C3D4</strong>
            </div>
            <div className="receipt-row">
              <span>O'quvchi</span>
              <strong>Ali Valiyev</strong>
            </div>
            <div className="receipt-row receipt-total">
              <span>To'landi</span>
              <strong>850 000 so'm</strong>
            </div>
            <p className="receipt-footer">{previewBrand.receiptFooter || "To'lovingiz uchun rahmat"}</p>
          </div>
        </aside>

        <div className="settings-main-column">
          <Form form={form} layout="vertical" onFinish={handleSave} className="settings-form">
            <div className="settings-editor-panel">
              <div className="settings-section-title">
                <ImagePlus size={18} />
                <span>Markaz ma'lumotlari</span>
              </div>
              <Form.Item
                name={['unify', 'name']}
                label="O'quv markaz nomi"
                rules={[{ required: true, message: "O'quv markaz nomini kiriting" }]}
              >
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item name={['unify', 'subtitle']} label="Qo‘shimcha yozuv">
                <Input maxLength={160} />
              </Form.Item>
              <Form.Item name={['unify', 'receiptFooter']} label="Chek rahmatnomasi">
                <Input maxLength={180} />
              </Form.Item>

              <Upload.Dragger {...uploadProps()} className="settings-logo-dropzone">
                <UploadCloud size={22} />
                <strong>Logo yuklash</strong>
                <span>PNG, JPG yoki WEBP, maksimal 5 MB</span>
              </Upload.Dragger>

              <div className="settings-actions">
                <Button type="primary" htmlType="submit" icon={<Save size={17} />} loading={isSaving}>
                  Saqlash
                </Button>
              </div>
            </div>
          </Form>
        </div>

        <div className="settings-rooms-panel">
          <div className="settings-section-title">
            <DoorOpen size={18} />
            <span>Xonalar</span>
          </div>
          <div className="settings-rooms-toolbar">
            <Button icon={<Plus size={16} />} onClick={openRoomModal}>
              Xona qo'shish
            </Button>
          </div>
          <Table
            className="settings-rooms-table"
            rowKey="name"
            size="small"
            pagination={false}
            dataSource={rooms.map((room, index) => ({ index: index + 1, name: room }))}
            columns={[
              { title: '#', dataIndex: 'index', width: 64 },
              { title: 'Xona nomi', dataIndex: 'name' },
              {
                title: 'Amallar',
                width: 96,
                render: (_value, record: { name: string }) => (
                  <Popconfirm
                    title="Xonani o'chirish?"
                    okText="O'chirish"
                    cancelText="Bekor qilish"
                    onConfirm={() => handleDeleteRoom(record.name)}
                  >
                    <Button danger size="small" icon={<Trash2 size={15} />} loading={isRoomsSaving} />
                  </Popconfirm>
                ),
              },
            ]}
          />
        </div>
      </div>

      <Modal
        title="Xona qo'shish"
        open={roomModalOpen}
        onCancel={() => setRoomModalOpen(false)}
        okText="Qo'shish"
        cancelText="Bekor qilish"
        confirmLoading={isRoomsSaving}
        onOk={() => roomForm.submit()}
        destroyOnClose
      >
        <Form form={roomForm} layout="vertical" onFinish={handleAddRoom}>
          <Form.Item
            name="name"
            label="Xona nomi"
            rules={[
              { required: true, message: 'Xona nomini kiriting' },
              { max: 40, message: 'Xona nomi 40 belgidan oshmasin' },
            ]}
          >
            <Input placeholder="Masalan: 1-xona yoki 303" autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
