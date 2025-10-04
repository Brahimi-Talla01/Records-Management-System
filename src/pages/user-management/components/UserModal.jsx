import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const UserModal = ({
  isOpen = false,
  onClose = () => {},
  onSave = () => {},
  user = null,
  mode = 'add' // 'add', 'edit'
}) => {

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    department: '',
    status: 'active',
    sendWelcomeEmail: true,
    requirePasswordChange: true
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'student',
        department: user?.department || '',
        status: user?.status || 'active',
        sendWelcomeEmail: false,
        requirePasswordChange: false
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'student',
        department: '',
        status: 'active',
        sendWelcomeEmail: true,
        requirePasswordChange: true
      });
    }
    setErrors({});
  }, [user, mode, isOpen]);

  const roleOptions = [
    { value: 'student', label: 'Étudiant' },
    { value: 'teacher', label: 'Enseignant' },
    { value: 'admin', label: 'Administrateur' }
  ];

  const departmentOptions = [
    { value: 'informatique', label: 'Informatique' },
    { value: 'mathematiques', label: 'Mathématiques' },
    { value: 'physique', label: 'Physique' },
    { value: 'chimie', label: 'Chimie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'litterature', label: 'Littérature' },
    { value: 'histoire', label: 'Histoire' },
    { value: 'economie', label: 'Économie' },
    { value: 'droit', label: 'Droit' },
    { value: 'medecine', label: 'Médecine' },
    { value: 'administration', label: 'Administration' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
    { value: 'suspended', label: 'Suspendu' },
    { value: 'pending', label: 'En attente' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.name?.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData?.email?.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData?.department) {
      newErrors.department = 'Le département est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 bg-opacity-50"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-modal w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name={mode === 'add' ? 'UserPlus' : 'Edit'} size={16} color="white" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {mode === 'add' ? 'Ajouter un utilisateur' : 'Modifier l\'utilisateur'}
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {mode === 'add' ?'Créer un nouveau compte utilisateur' :'Modifier les informations de l\'utilisateur'
                }
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-md font-heading font-medium text-foreground">
              Informations de base
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nom complet"
                type="text"
                value={formData?.name}
                onChange={(e) => handleInputChange('name', e?.target?.value)}
                error={errors?.name}
                required
                placeholder="Entrez le nom complet"
              />

              <Input
                label="Adresse email"
                type="email"
                value={formData?.email}
                onChange={(e) => handleInputChange('email', e?.target?.value)}
                error={errors?.email}
                required
                placeholder="utilisateur@universite.fr"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Rôle"
                options={roleOptions}
                value={formData?.role}
                onChange={(value) => handleInputChange('role', value)}
                required
              />

              <Select
                label="Département"
                options={departmentOptions}
                value={formData?.department}
                onChange={(value) => handleInputChange('department', value)}
                error={errors?.department}
                required
                searchable
              />
            </div>

            <Select
              label="Statut du compte"
              options={statusOptions}
              value={formData?.status}
              onChange={(value) => handleInputChange('status', value)}
              required
            />
          </div>

          {/* Options */}
          {mode === 'add' && (
            <div className="space-y-4">
              <h3 className="text-md font-heading font-medium text-foreground">
                Options de création
              </h3>
              
              <div className="space-y-3">
                <Checkbox
                  label="Envoyer un email de bienvenue"
                  description="L'utilisateur recevra un email avec ses informations de connexion"
                  checked={formData?.sendWelcomeEmail}
                  onChange={(e) => handleInputChange('sendWelcomeEmail', e?.target?.checked)}
                />

                <Checkbox
                  label="Exiger un changement de mot de passe"
                  description="L'utilisateur devra changer son mot de passe lors de sa première connexion"
                  checked={formData?.requirePasswordChange}
                  onChange={(e) => handleInputChange('requirePasswordChange', e?.target?.checked)}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={isLoading}
              iconName={mode === 'add' ? 'UserPlus' : 'Save'}
              iconPosition="left"
              iconSize={16}
            >
              {mode === 'add' ? 'Créer l\'utilisateur' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;