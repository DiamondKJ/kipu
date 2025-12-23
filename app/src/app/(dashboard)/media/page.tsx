'use client';

import {
  Copy,
  Download,
  FileText,
  Filter,
  FolderOpen,
  Grid,
  Image as ImageIcon,
  List,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

type ViewMode = 'grid' | 'list';
type MediaType = 'all' | 'image' | 'video' | 'document';

type MediaFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  created_at: string;
}

export default function MediaLibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  // eslint-disable-next-line react/hook-use-state -- setter intentionally unused
  const [files] = useState<MediaFile[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const _droppedFiles = Array.from(e.dataTransfer.files);
    // TODO: Handle file upload
  }, []);

  const toggleFileSelection = (id: string) => {
    setSelectedFiles((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {return <ImageIcon className="h-6 w-6" />;}
    if (type.startsWith('video/')) {return <Video className="h-6 w-6" />;}
    return <FileText className="h-6 w-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Media Library</h1>
          <p className="text-zinc-400 mt-1">
            Upload and manage your media files
          </p>
        </div>
        <Button className="bg-teal-500 hover:bg-teal-600">
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-zinc-800">
                <Filter className="h-4 w-4 mr-2" />
                {mediaType === 'all' ? 'All files' : mediaType}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setMediaType('all')}>
                All files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMediaType('image')}>
                Images
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMediaType('video')}>
                Videos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMediaType('document')}>
                Documents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {selectedFiles.length > 0 ? <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              {selectedFiles.length} selected
            </Badge> : null}
          <div className="flex items-center border border-zinc-800 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-none ${
                viewMode === 'grid' ? 'bg-zinc-800' : ''
              }`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-none ${
                viewMode === 'list' ? 'bg-zinc-800' : ''
              }`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Drop Zone / Content */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drag and drop zone */}
      <div
        role="region"
        aria-label="File drop zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`min-h-[400px] rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-teal-500 bg-teal-500/5'
            : 'border-zinc-800 bg-zinc-900/50'
        }`}
      >
        {files.length > 0 && viewMode === 'grid' ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {files.map((file) => (
              <Card
                key={file.id}
                className={`bg-zinc-800 border-zinc-700 cursor-pointer transition-all ${
                  selectedFiles.includes(file.id)
                    ? 'ring-2 ring-teal-500'
                    : 'hover:border-zinc-600'
                }`}
                onClick={() => toggleFileSelection(file.id)}
              >
                <CardContent className="p-2">
                  <div className="aspect-square rounded bg-zinc-900 flex items-center justify-center mb-2 overflow-hidden">
                    {file.thumbnail_url ? (
                      <img
                        src={file.thumbnail_url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-zinc-500">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatFileSize(file.size)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div> : null}
        {files.length > 0 && viewMode === 'list' ? <div className="divide-y divide-zinc-800">
            {files.map((file) => (
              <div
                key={file.id}
                role="button"
                tabIndex={0}
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                  selectedFiles.includes(file.id)
                    ? 'bg-teal-500/10'
                    : 'hover:bg-zinc-800/50'
                }`}
                onClick={() => toggleFileSelection(file.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFileSelection(file.id);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-500">
                    {getFileIcon(file.type)}
                  </div>
                  <div>
                    <p className="text-sm text-white">{file.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatFileSize(file.size)} •{' '}
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div> : null}
        {files.length === 0 ? <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
            <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No files yet
            </h3>
            <p className="text-zinc-500 mb-6 max-w-sm">
              Drag and drop files here, or click the upload button to get started
            </p>
            <Button className="bg-teal-500 hover:bg-teal-600">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div> : null}
      </div>
    </div>
  );
}
