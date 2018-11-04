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

export interface PutIoSearchResponse {
    files: PutIoFile[];
    next: string | null;
    status: string;
    total: number;
}

export interface AuthResponse {
    access_token: string;
}

export interface UserInfo {
    account_active: boolean;
    avatar_url: string;
    can_create_sub_account: boolean;
    days_until_files_deletion: number;
    disk: {
        avail: number;
        size: number;
        used: number;
    };
    has_voucher: boolean;
    is_sub_account: boolean;
    mail: string;
    plan_expiration_date: string;
    private_download_host_ip: null;
    settings: {
        beta_user: false;
        callback_url: string;
        dark_theme: false;
        default_download_folder: number;
        fluid_layout: false;
        history_enabled: true;
        is_invisible: null;
        locale: null;
        next_episode: true;
        pushover_token: null;
        sort_by: string;
        start_from: true;
        subtitle_languages: string[];
        theater_mode: false;
        transfer_sort_by: string;
        trash_enabled: true;
        tunnel_route_name: string;
        use_private_download_ip: false;
        video_player: null
    };
    simultaneous_download_limit: number;
    subtitle_languages: string[];
    user_id: number;
    username: string;
}

export const authenticatedApi = (token: string) => ({
    accountInfo: `https://api.put.io/v2/account/info?oauth_token=${token}`,
    fileUrl: (fileId: number) => `https://api.put.io/v2/files/${fileId}?oauth_token=${token}`,
    fileListUrl: (parentId: number) => `https://api.put.io/v2/files/list?parent_id=${parentId}&oauth_token=${token}`,
    search: (type: PutIoFileType, page?: number) => `https://api.put.io/v2/files/search/type:${type.toLowerCase()}/page/${page || -1}?oauth_token=${token}`
})
