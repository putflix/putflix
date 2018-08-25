declare module "parse-torrent-name" {
    interface Result {
        audio?: string;
        codec?: string;
        container?: string;
        episode?: number;
        episodeName?: string;
        excess?: string;
        extended?: string;
        garbage?: string;
        group?: string;
        hardcoded?: boolean;
        language?: string;
        proper?: boolean;
        quality?: string;
        region?: string;
        repack?: boolean;
        resolution?: string;
        season?: number;
        title: string;
        website?: string;
        widescreen?: boolean;
        year?: number;
    }

    const Parser: (query: string) => Result;
    export = Parser;
}
