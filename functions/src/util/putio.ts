export type FakeBool = 'True' | 'False';

export enum PutIoFileType {
    Folder = 'FOLDER',
    Text = 'TEXT',
    Video = 'VIDEO',
    Image = 'IMAGE',
}

export interface PutIoFile {
    content_type: string;
    crc32: string | null;
    created_at: string;
    extension: string | null;
    file_type: PutIoFileType;
    first_accessed_at: string | null;
    folder_type: 'REGULAR';
    icon: string;
    id: number;
    is_hidden: boolean;
    is_mp4_available: boolean;
    is_shared: boolean;
    name: string;
    opensubtitles_hash: string | null;
    parent_id: number;
    screenshot: string | null;
    size: number;
}

export enum TransferStatus {
    Completed = 'COMPLETED',
    Downloading = 'DOWNLOADING',
    InQueue = 'IN_QUEUE',
}

export interface PutIoTransfer {
    callback_url: string;
    completion_percent: number;
    created_at: string;
    created_torrent: FakeBool;
    current_ratio: number;
    download_id: number;
    downloaded: number;
    down_speed: number;
    extract: FakeBool;
    file_id: number;
    finished_at: string;
    id: number;
    is_private: FakeBool;
    name: string;
    percent_done: number;
    peers_connected: number;
    peers_getting_from_us: number;
    peers_sending_to_us: number;
    save_parent_id: number;
    simulated: FakeBool;
    size: number;
    source: string;
    status: TransferStatus;
    status_message: string;
    torrent_link: string;
    type: string;
    uploaded: number;
    up_speed: number;
}

export const authenticatedApi = (token: string) => ({
    fileUrl: (fileId: number) => `https://api.put.io/v2/files/${fileId}?oauth_token=${token}`,
    fileListUrl: (parentId: number) => `https://api.put.io/v2/files/list?parent_id=${parentId}&oauth_token=${token}`,
})
