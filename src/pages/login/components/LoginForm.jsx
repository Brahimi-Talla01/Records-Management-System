import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const LoginForm = ({ onLogin, isLoading = false }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData?.username?.trim()) {
      newErrors.username = 'Le nom d\'utilisateur est requis';
    }
    
    if (!formData?.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData?.password?.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (validateForm()) {
      onLogin(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Nom d'utilisateur ou email"
          type="text"
          placeholder="Entrez votre nom d'utilisateur"
          value={formData?.username}
          onChange={(e) => handleInputChange('username', e?.target?.value)}
          error={errors?.username}
          required
          disabled={isLoading}
          className="w-full"
        />

        <div className="relative">
          <Input
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            placeholder="Entrez votre mot de passe"
            value={formData?.password}
            onChange={(e) => handleInputChange('password', e?.target?.value)}
            error={errors?.password}
            required
            disabled={isLoading}
            className="w-full pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={20} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Checkbox
          label="Se souvenir de moi"
          checked={formData?.rememberMe}
          onChange={(e) => handleInputChange('rememberMe', e?.target?.checked)}
          disabled={isLoading}
        />

        <button
          type="button"
          className="text-sm text-primary hover:text-primary/80 font-body transition-colors"
          disabled={isLoading}
        >
          Mot de passe oublié ?
        </button>
      </div>
      <Button
        type="submit"
        variant="default"
        size="lg"
        fullWidth
        loading={isLoading}
        iconName="LogIn"
        iconPosition="left"
        iconSize={20}
        className="font-body"
      >
        Se connecter
      </Button>
    </form>
  );
};

export default LoginForm;