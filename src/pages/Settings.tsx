import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('app_username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleSave = () => {
    if (!username || !password) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir le nom d\'utilisateur et le mot de passe.',
        variant: 'destructive',
      });
      return;
    }
    localStorage.setItem('app_username', username);
    localStorage.setItem('app_password', password);
    toast({
      title: 'Paramètres enregistrés',
      description: 'Le nom d\'utilisateur et le mot de passe ont été mis à jour.',
    });
    setPassword(''); // Clear password field after saving
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres d'authentification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez le nom d'utilisateur"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez le nouveau mot de passe"
            />
          </div>
          <Button onClick={handleSave}>Enregistrer les paramètres</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;