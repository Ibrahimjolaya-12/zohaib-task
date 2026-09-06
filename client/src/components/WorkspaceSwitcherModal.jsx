import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Modal } from './ui.jsx';

export default function WorkspaceSwitcherModal({ open, onClose, workspaces, current }) {
  const navigate = useNavigate();

  return (
    <Modal open={open} onClose={onClose} title="Switch workspace">
      <div className="space-y-1">
        {workspaces.map((ws) => (
          <button
            key={ws._id}
            onClick={() => {
              onClose();
              navigate(`/w/${ws.slug}`);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              {ws.name.charAt(0)}
            </div>
            <span className="flex-1 text-sm font-medium">{ws.name}</span>
            {ws._id === current._id && <Check className="h-4 w-4 text-brand-600" />}
          </button>
        ))}
        <Link
          to="/"
          onClick={onClose}
          className="block rounded-lg px-3 py-2.5 text-sm text-brand-600 hover:bg-slate-100"
        >
          All workspaces →
        </Link>
      </div>
    </Modal>
  );
}
