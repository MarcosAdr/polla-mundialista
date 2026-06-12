
import { TEAMS } from '@/lib/teams';
import { TeamStanding } from '@/components/GroupStandings';

export function calculateGroups(matches: any[]) {
    const standingsMap: Record<string, TeamStanding> = {};

    // 1. Inicializamos usando el 'name' como identificador único
    TEAMS.forEach(team => {
        standingsMap[team.name] = {
            id: team.name,         // Usamos el nombre como ID para que no falle React (key)
            name: team.name,
            flagUrl: team.code,    // En tu array, el código de la bandera se llama 'code'
            group: team.group,     // Extraemos el grupo de tu array
            pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0
        };
    });

    // Filtramos solo los partidos terminados de la Fase de Grupos
    const groupMatches = matches.filter(m => m.isFinished && m.stage?.name === 'Fase de Grupos');

    groupMatches.forEach(match => {
        // 2. Buscamos en nuestro mapa usando el NOMBRE del equipo que viene de la base de datos
        const teamA = standingsMap[match.teamA?.name];
        const teamB = standingsMap[match.teamB?.name];

        // Si falta algún equipo o marcador, saltamos este partido
        if (!teamA || !teamB || match.teamAScore === null || match.teamBScore === null) return;

        // Sumar Partidos Jugados
        teamA.pj += 1;
        teamB.pj += 1;

        // Sumar Goles a Favor (gf) y en Contra (gc)
        teamA.gf += match.teamAScore;
        teamA.gc += match.teamBScore;
        teamB.gf += match.teamBScore;
        teamB.gc += match.teamAScore;

        // Lógica para asignar puntos, victorias, empates, derrotas y el último resultado
        if (match.teamAScore > match.teamBScore) {
            teamA.g += 1; teamA.pts += 3; teamB.p += 1;
            
        } else if (match.teamAScore < match.teamBScore) {
            teamB.g += 1; teamB.pts += 3; teamA.p += 1;
            
        } else {
            teamA.e += 1; teamA.pts += 1; teamB.e += 1; teamB.pts += 1;
        }
    });

    const groupedStandings: Record<string, TeamStanding[]> = {};

    // 3. Calculamos diferencia de goles y agrupamos
    Object.values(standingsMap).forEach(team => {
        team.dg = team.gf - team.gc;

        const groupName = team.group || 'Sin Grupo';
        if (!groupedStandings[groupName]) {
            groupedStandings[groupName] = [];
        }
        groupedStandings[groupName].push(team);
    });

    // 4. Ordenamos los grupos (Puntos > Diferencia de Goles > Goles a Favor)
    Object.keys(groupedStandings).forEach(group => {
        groupedStandings[group].sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts; // Prioridad 1: Puntos
            if (b.dg !== a.dg) return b.dg - a.dg;     // Prioridad 2: Diferencia de goles
            return b.gf - a.gf;                        // Prioridad 3: Goles a favor
        });
    });

    return groupedStandings;
}