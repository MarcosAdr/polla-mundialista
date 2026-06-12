import React from 'react';

export type TeamStanding = {
    id: string;
    name: string;
    group: string;
    flagUrl?: string | null;
    pj: number; g: number; e: number; p: number; gf: number; gc: number; dg: number; pts: number;
};

interface GroupTableProps {
    groupName: string;
    standings: TeamStanding[];
}

export default function GroupStandings({ groupName, standings }: GroupTableProps) {
    return (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', overflow: 'hidden' }}>

            {/* Cabecera: usando variables de tu tema */}
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600, color: 'var(--text)' }}>
                    Posiciones
                </h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {groupName}
                </div>
            </div>

            {/* Tabla */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.95rem' }}>
                    <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, width: '45%' }}>Equipo</th>
                        <th style={{ padding: '12px 4px', color: 'var(--text-muted)', fontWeight: 600 }}>PJ</th>
                        <th style={{ padding: '12px 4px', color: 'var(--text-muted)', fontWeight: 600 }}>G</th>
                        <th style={{ padding: '12px 4px', color: 'var(--text-muted)', fontWeight: 600 }}>E</th>
                        <th style={{ padding: '12px 4px', color: 'var(--text-muted)', fontWeight: 600 }}>P</th>
                        <th style={{ padding: '12px 4px', color: 'var(--text-muted)', fontWeight: 600 }}>DG</th>
                        <th style={{ padding: '12px 8px', color: 'var(--text)', fontWeight: 700 }}>Pts</th>
                    </tr>
                    </thead>
                    <tbody>
                    {standings.map((team, index) => (
                        <tr key={team.id} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 8px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ width: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</span>
                                {team.flagUrl ? (
                                    <img
                                        src={`https://flagcdn.com/w40/${team.flagUrl}.png`}
                                        alt={team.name}
                                        style={{ width: '24px', height: '16px', borderRadius: '2px', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '24px', height: '16px', backgroundColor: 'var(--surface-hover)', borderRadius: '2px' }} />
                                )}
                                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{team.name}</span>
                            </td>

                            <td style={{ padding: '12px 4px', color: 'var(--text)' }}>{team.pj}</td>
                            <td style={{ padding: '12px 4px', color: 'var(--text)' }}>{team.g}</td>
                            <td style={{ padding: '12px 4px', color: 'var(--text)' }}>{team.e}</td>
                            <td style={{ padding: '12px 4px', color: 'var(--text)' }}>{team.p}</td>
                            <td style={{ padding: '12px 4px', color: 'var(--text)' }}>{team.dg > 0 ? `+${team.dg}` : team.dg}</td>
                            <td style={{ padding: '12px 8px', color: 'var(--text)', fontWeight: 700 }}>{team.pts}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}