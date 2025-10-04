import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const TwoFactorAuth = ({ onVerify, onResend, isLoading = false, onBack }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [error, setError] = useState('');

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds?.toString()?.padStart(2, '0')}`;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!verificationCode?.trim()) {
      setError('Le code de vérification est requis');
      return;
    }
    if (verificationCode?.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }
    setError('');
    onVerify(verificationCode);
  };

  const handleResend = () => {
    setTimeLeft(300);
    setError('');
    onResend();
  };

  const handleInputChange = (value) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value?.replace(/\D/g, '')?.slice(0, 6);
    setVerificationCode(numericValue);
    if (error) setError('');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Shield" size={32} className="text-accent" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground">
          Authentification à deux facteurs
        </h3>
        <p className="text-sm text-muted-foreground font-body">
          Entrez le code de vérification envoyé à votre appareil mobile
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Code de vérification"
          type="text"
          placeholder="000000"
          value={verificationCode}
          onChange={(e) => handleInputChange(e?.target?.value)}
          error={error}
          required
          disabled={isLoading}
          className="text-center text-2xl tracking-widest font-data"
          maxLength={6}
        />

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground font-body">
            Code expire dans: <span className="font-medium text-warning">{formatTime(timeLeft)}</span>
          </p>
          
          {timeLeft === 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={isLoading}
              iconName="RefreshCw"
              iconPosition="left"
              iconSize={16}
              className="font-body"
            >
              Renvoyer le code
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading || timeLeft > 240}
              className="text-sm text-primary hover:text-primary/80 font-body transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Renvoyer le code
            </button>
          )}
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            variant="default"
            size="lg"
            fullWidth
            loading={isLoading}
            iconName="Check"
            iconPosition="left"
            iconSize={20}
            className="font-body"
          >
            Vérifier
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={onBack}
            disabled={isLoading}
            iconName="ArrowLeft"
            iconPosition="left"
            iconSize={20}
            className="font-body"
          >
            Retour
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TwoFactorAuth;