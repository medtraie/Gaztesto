import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    const storedUsername = localStorage.getItem('app_username');
    const storedPassword = localStorage.getItem('app_password');

    const isAdmin = username === 'admin' && password === 'gaz123456';
    const isUser = username === storedUsername && password === storedPassword;

    if (isAdmin || isUser) {
      sessionStorage.setItem('is_authenticated', 'true');
      navigate('/');
    } else if (!storedUsername || !storedPassword) {
      toast({
        title: 'Erreur de configuration',
        description: "Aucun utilisateur n'est configuré. Veuillez contacter l'administrateur.",
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Échec de la connexion',
        description: 'Nom d\'utilisateur ou mot de passe incorrect.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Connexion - GazManager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <Button onClick={handleLogin} className="w-full">
            Se connecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;