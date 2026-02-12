'use client';

interface ProfileStatsProps {
    influence: number;
    creations: number;
    followers: number;
    following: number;
}

export default function ProfileStats({
    influence,
    creations,
    followers,
    following
}: ProfileStatsProps) {
    return (
        <div className="flex flex-wrap justify-center md:justify-start gap-8 mt-6">
            <div className="text-center md:text-left">
                <p className="text-3xl font-black text-primary">{influence}</p>
                <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Community Influence</p>
            </div>
            <div className="text-center md:text-left">
                <p className="text-3xl font-black text-foreground">{creations}</p>
                <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Creations</p>
            </div>
            <div className="text-center md:text-left">
                <p className="text-3xl font-black text-foreground">{followers}</p>
                <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Followers</p>
            </div>
            <div className="text-center md:text-left">
                <p className="text-3xl font-black text-foreground">{following}</p>
                <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Following</p>
            </div>
        </div>
    );
}
