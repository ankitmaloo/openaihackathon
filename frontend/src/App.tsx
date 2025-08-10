import { Header } from "./components/Header";
import { ChatInterface } from "./components/ChatInterface";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-primary/10 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/10 pointer-events-none" />
        <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <ChatInterface />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;