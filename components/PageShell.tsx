import Header from "./Header";
import Footer from "./Footer";

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-panel">
      <Header />
      <main className="mx-auto max-w-[1440px] border-line-soft sm:border-x">
        {children}
        <Footer />
      </main>
    </div>
  );
}
