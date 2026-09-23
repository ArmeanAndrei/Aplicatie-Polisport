"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getCurrentSport } from "@/lib/sport";

type ActionResult = { success: true } | { error: string };

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Împarte echipele în 4 grupe (A, B, C, D)
 */
export async function drawGroupsAction(): Promise<ActionResult> {
  const supabase = getAdminClient();
  const sport = await getCurrentSport();

  // 1. Fetch echipe
  const { data: teams, error: fetchErr } = await supabase.from("teams").select("id").eq("sport_type", sport);
  if (fetchErr) return { error: fetchErr.message };
  
  const expectedTeams = sport === "basketball" ? 16 : 36;
  if (!teams || teams.length !== expectedTeams) {
    return { error: `Pentru ${sport} trebuie să existe exact ${expectedTeams} de echipe. Găsite: ${teams?.length || 0}.` };
  }

  // 2. Amestecăm echipele (Fisher-Yates)
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 3. Asignăm grupele
  const groups = ["A", "B", "C", "D"];
  const teamsPerGroup = expectedTeams / 4;
  
  const updates = shuffled.map((team, index) => {
    const groupIndex = Math.floor(index / teamsPerGroup);
    return {
      id: team.id,
      group_name: groups[groupIndex]
    };
  });

  const updatePromises = updates.map(u => 
    supabase.from("teams").update({ group_name: u.group_name }).eq("id", u.id)
  );

  const results = await Promise.all(updatePromises);
  const err = results.find(r => r.error);
  if (err) return { error: err.error!.message };

  revalidatePath("/admin/tragere-la-sorti");
  revalidatePath("/admin/echipe");
  return { success: true };
}

/**
 * Generează meciuri pentru echipele din grupe (4 meciuri pe echipă)
 */
export async function drawMatchesAction(): Promise<ActionResult> {
  const supabase = getAdminClient();
  const sport = await getCurrentSport();

  // 1. Ștergem meciurile vechi din faza de grupe
  await supabase.from("matches").delete().eq("stage", "group").eq("sport_type", sport);

  // 2. Fetch echipe cu grupele lor
  const { data: teams, error: fetchErr } = await supabase.from("teams").select("id, group_name").eq("sport_type", sport);
  if (fetchErr) return { error: fetchErr.message };

  if (!teams || teams.some(t => !t.group_name)) {
    return { error: "Nu toate echipele au o grupă alocată. Faceți mai întâi tragerea grupelor." };
  }

  // Grupăm echipele
  const grouped: Record<string, string[]> = {};
  for (const t of teams) {
    if (!grouped[t.group_name]) grouped[t.group_name] = [];
    grouped[t.group_name].push(t.id);
  }

  const matchesToInsert: any[] = [];
  const expectedPerGroup = sport === "basketball" ? 4 : 9;

  for (const [group, groupTeams] of Object.entries(grouped)) {
    if (groupTeams.length !== expectedPerGroup) {
      return { error: `Grupa ${group} are ${groupTeams.length} echipe. Trebuie să aibă exact ${expectedPerGroup}.` };
    }

    const arr = [...groupTeams];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    if (sport === "basketball") {
      // Fiecare cu fiecare (4 echipe = 6 meciuri)
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          matchesToInsert.push({
            home_team_id: arr[i],
            away_team_id: arr[j],
            stage: "group",
            status: "scheduled",
            match_time: null,
            sport_type: sport
          });
        }
      }
    } else {
      // Fotbal (Distanța 1 și 2)
      const n = arr.length;
      for (let i = 0; i < n; i++) {
        matchesToInsert.push({
          home_team_id: arr[i],
          away_team_id: arr[(i + 1) % n],
          stage: "group",
          status: "scheduled",
          match_time: null,
          sport_type: sport
        });
      }
      for (let i = 0; i < n; i++) {
        matchesToInsert.push({
          home_team_id: arr[i],
          away_team_id: arr[(i + 2) % n],
          stage: "group",
          status: "scheduled",
          match_time: null,
          sport_type: sport
        });
      }
    }
  }

  const { error: insertErr } = await supabase.from("matches").insert(matchesToInsert);
  if (insertErr) return { error: insertErr.message };

  revalidatePath("/admin/tragere-la-sorti");
  revalidatePath("/admin/meciuri");
  revalidatePath("/admin/program");
  return { success: true };
}
