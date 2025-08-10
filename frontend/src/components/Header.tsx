import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Palette, Sun, Moon, Waves, Sunset } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export const Header = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'ocean', label: 'Ocean', icon: Waves },
    { value: 'sunset', label: 'Sunset', icon: Sunset },
  ];

  return (
    <header className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="font-semibold text-lg hover:bg-accent/50 transition-colors"
            >
              ChatGPT <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>GPT-4</DropdownMenuItem>
            <DropdownMenuItem>GPT-3.5</DropdownMenuItem>
            <DropdownMenuItem>Custom GPT</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="hover:bg-accent/50 transition-all duration-200 hover:scale-105"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuItem 
                  key={option.value}
                  onClick={() => setTheme(option.value as any)}
                  className={theme === option.value ? 'bg-accent' : ''}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {option.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="ghost" 
          size="sm"
          className="hover:bg-accent/50 transition-all duration-200 hover:scale-105"
        >
          Log in
        </Button>
        
        <Button 
          size="sm"
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 hover:scale-105 hover:shadow-lg"
        >
          Sign up for free
        </Button>
      </div>
    </header>
  );
};