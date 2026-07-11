import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import uzUZ from 'antd/locale/uz_UZ';
import { Provider } from 'react-redux';
import App from './app/App';
import { store } from './app/store';
import { AuthProvider } from './auth/AuthContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <ConfigProvider
          locale={uzUZ}
          theme={{
            algorithm: theme.darkAlgorithm,
            token: {
              colorPrimary: '#E83F63',
              colorInfo: '#3A86FF',
              colorSuccess: '#20C997',
              colorWarning: '#F59E0B',
              colorError: '#FF4D4F',
              colorText: '#E7EAF0',
              colorTextSecondary: '#AEB4C0',
              colorBgBase: '#15171C',
              colorBgLayout: '#181A20',
              colorBgContainer: '#1F222A',
              colorBorder: '#303540',
              borderRadius: 8,
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
            components: {
              Button: {
                primaryShadow: 'none',
              },
              DatePicker: {
                activeBorderColor: '#3A86FF',
                hoverBorderColor: '#3A86FF',
                activeShadow: '0 0 0 2px rgba(58, 134, 255, 0.14)',
              },
              Drawer: {
                colorBgElevated: '#15171C',
              },
              Input: {
                activeBorderColor: '#3A86FF',
                hoverBorderColor: '#3A86FF',
                activeShadow: '0 0 0 2px rgba(58, 134, 255, 0.14)',
              },
              InputNumber: {
                activeBorderColor: '#3A86FF',
                hoverBorderColor: '#3A86FF',
                activeShadow: '0 0 0 2px rgba(58, 134, 255, 0.14)',
              },
              Select: {
                activeBorderColor: '#3A86FF',
                hoverBorderColor: '#3A86FF',
                activeOutlineColor: 'rgba(58, 134, 255, 0.14)',
                optionSelectedBg: 'rgba(232, 63, 99, 0.20)',
                optionSelectedColor: '#F5F7FA',
              },
            },
          }}
        >
          <App />
        </ConfigProvider>
      </AuthProvider>
    </Provider>
  </React.StrictMode>,
);
