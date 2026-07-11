import { Button, Form, Input, Typography, message } from 'antd';
import { LockKeyhole, LogIn, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import tizimPlusLogo from '../../assets/tizim-plus-logo.png';

type LoginValues = {
  fullName?: string;
  username: string;
  password: string;
};

export default function LoginPage() {
  const { login, setup, setupRequired } = useAuth();
  const [form] = Form.useForm<LoginValues>();

  async function handleSubmit(values: LoginValues) {
    try {
      if (setupRequired) {
        await setup({
          fullName: values.fullName || '',
          username: values.username,
          password: values.password,
        });
        message.success('Owner yaratildi');
      } else {
        await login(values);
        message.success('Tizimga kirildi');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Tizimga kirib bo‘lmadi');
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img className="auth-logo" src={tizimPlusLogo} alt="Tizim+ logosi" />
        <Typography.Text type="secondary">
          {setupRequired ? 'Birinchi owner hisobini yarating' : 'Boshqaruv tizimiga kiring'}
        </Typography.Text>

        <Form form={form} layout="vertical" onFinish={handleSubmit} className="auth-form">
          {setupRequired ? (
            <Form.Item
              name="fullName"
              label="F.I.Sh"
              rules={[{ required: true, min: 3, message: 'F.I.Sh kiriting' }]}
            >
              <Input prefix={<UserRound size={17} />} placeholder="Owner F.I.Sh" />
            </Form.Item>
          ) : null}

          <Form.Item
            name="username"
            label="Login"
            normalize={(value) => value?.toLowerCase().trim()}
            rules={[
              { required: true, message: 'Loginni kiriting' },
              { pattern: /^[a-z0-9._-]{3,60}$/, message: 'Faqat lotin harflari, raqam, nuqta, chiziq' },
            ]}
          >
            <Input prefix={<UserRound size={17} />} autoComplete="username" placeholder="Login" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Parol"
            rules={[{ required: true, min: 6, message: 'Parol kamida 6 ta belgi' }]}
          >
            <Input.Password prefix={<LockKeyhole size={17} />} autoComplete="current-password" placeholder="Parol" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block icon={<LogIn size={18} />}>
            {setupRequired ? 'Owner yaratish' : 'Kirish'}
          </Button>
        </Form>
      </section>
    </main>
  );
}
