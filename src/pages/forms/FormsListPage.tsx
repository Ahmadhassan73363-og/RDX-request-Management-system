import React, { useState } from 'react';
import { FormInput, Plus, Edit2, Trash2, Eye, SendHorizontal, Layers, CheckCircle2 } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { FormSchema } from '../../types/form';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FormBuilderPage } from './FormBuilderPage';
import { useSyncedState } from '../../hooks/useSyncedState';

interface FormsListPageProps {
  onNavigateToAssignments: () => void;
}

export const FormsListPage: React.FC<FormsListPageProps> = ({ onNavigateToAssignments }) => {
  const { currentUser, hasPermission } = useAuth();
  const [forms, setForms] = useSyncedState<FormSchema[]>(() => dataService.getForms());
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const canCreateForms = hasPermission('forms:create');
  const canEditForms = hasPermission('forms:edit');
  const canDeleteForms = hasPermission('forms:delete');

  const refreshForms = () => {
    setForms(dataService.getForms());
  };

  const handleDeleteForm = (id: string) => {
    if (confirm('Are you sure you want to delete this dynamic form?')) {
      dataService.deleteForm(id, currentUser);
      refreshForms();
    }
  };

  if (isCreating || editingFormId) {
    return (
      <FormBuilderPage
        formId={editingFormId || undefined}
        onBack={() => {
          setIsCreating(false);
          setEditingFormId(null);
          refreshForms();
        }}
        onSaved={() => {
          setIsCreating(false);
          setEditingFormId(null);
          refreshForms();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FormInput className="w-5 h-5 text-primary" />
            Dynamic Form Generator & Schemas
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure custom request and corporate approval forms with no-code field generation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToAssignments}
            leftIcon={<SendHorizontal className="w-3.5 h-3.5" />}
          >
            Assignment Tracking
          </Button>

          {canCreateForms && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreating(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Build New Form
            </Button>
          )}
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {forms.map((form) => (
          <Card key={form.id} hoverEffect className="flex flex-col justify-between p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase">
                  v{form.version}.0 • {form.category}
                </span>

                <div className="flex items-center gap-1">
                  {canEditForms && (
                    <button
                      onClick={() => setEditingFormId(form.id)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                      title="Edit schema"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDeleteForms && (
                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                      title="Delete form"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground">{form.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {form.description}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 text-xs flex items-center justify-between font-mono">
                <span className="text-muted-foreground">{form.fields.length} Active Fields</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready for Assignment
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">
                Author: {form.createdByName}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingFormId(form.id)}
                className="text-[11px] h-7 px-2.5"
              >
                Inspect / Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
