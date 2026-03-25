import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { populateDummyData } from './db/db';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { Study } from './pages/Study';
import { Review } from './pages/Review';
import { MockExam } from './pages/MockExam';
import { Settings } from './pages/Settings';

// ルーティングごとにLayoutのボトムナビゲーション表示を制御するためのラッパー関数
const RouteWrapper = ({ children, hideNav = false }: { children: React.ReactNode, hideNav?: boolean }) => {
  return <Layout showNav={!hideNav}>{children}</Layout>;
};

function App() {
  // アプリ起動時にダミーデータを投入
  useEffect(() => {
    populateDummyData().catch(console.error);
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<RouteWrapper><Home /></RouteWrapper>} />
        {/* 学習中は画面を広く使いたいため、ボトムナビを隠す */}
        <Route path="/study" element={<RouteWrapper hideNav><Study /></RouteWrapper>} />
        <Route path="/review" element={<RouteWrapper hideNav><Review /></RouteWrapper>} />
        <Route path="/mock-exam" element={<RouteWrapper hideNav><ErrorBoundary><MockExam /></ErrorBoundary></RouteWrapper>} />
        <Route path="/settings" element={<RouteWrapper><Settings /></RouteWrapper>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
