import React, { useState } from 'react';
import Button from '../ui/Button';
import { FileText, Upload, X } from 'lucide-react';
import { db } from '../../services/db';

interface PdfUploaderProps {
    projectId: string;
    onUploadComplete: (content: any) => void;
    onClose: () => void;
}

const PdfUploader: React.FC<PdfUploaderProps> = ({ projectId, onUploadComplete, onClose }) => {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf') {
                setFile(droppedFile);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('id', crypto.randomUUID());
            formData.append('projectId', projectId);
            formData.append('type', 'pdf');
            formData.append('title', file.name);
            formData.append('content', 'PDF Document'); // Placeholder for now, real extraction would happen server-side
            formData.append('metadata', JSON.stringify({ fileName: file.name, size: file.size }));
            formData.append('createdAt', Date.now().toString());

            const res = await fetch('http://localhost:3001/api/content', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            // Construct local optimistic object
            const newContent = {
                id: formData.get('id'),
                projectId,
                type: 'pdf',
                title: file.name,
                content: 'PDF Document',
                metadata: { fileName: file.name, size: file.size },
                createdAt: parseInt(formData.get('createdAt') as string)
            };

            onUploadComplete(newContent);
            setFile(null); // Reset
            onClose(); // Close modal
        } catch (error) {
            console.error(error);
            // toast.error('Upload failed') - assume toast is available via parent or add import if needed, but keeping changes minimal.
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="text-indigo-600" /> Upload PDF
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {!file ? (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}
                    >
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                            <Upload size={24} />
                        </div>
                        <p className="font-medium text-slate-700 mb-1">Drag & drop your PDF here</p>
                        <p className="text-xs text-slate-400">or click to browse</p>
                        <input
                            type="file"
                            accept="application/pdf"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                                if (e.target.files?.[0]) setFile(e.target.files[0]);
                            }}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <FileText className="text-indigo-600" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-slate-800 truncate">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
                                <X size={16} />
                            </button>
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleUpload}
                            loading={uploading}
                        >
                            Process & Add Content
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PdfUploader;
