# Discord Security Bot

Bot cu anti-raid, anti-nuke, anti-spam, moderare, music player si VC recorder.

## 1. Creeaza aplicatia bot pe Discord

1. Mergi pe https://discord.com/developers/applications
2. **New Application** → da-i un nume
3. In stanga, mergi la **Bot** → **Add Bot**
4. La sectiunea **Privileged Gateway Intents**, activeaza:
   - `SERVER MEMBERS INTENT` (necesar pentru anti-raid)
   - `MESSAGE CONTENT INTENT` (necesar pentru anti-spam)
5. Apasa **Reset Token** si copiaza tokenul — il pui in `.env`, NU il posta nicaieri
6. Din **OAuth2 → General**, copiaza **Client ID** — il pui in `.env` la `CLIENT_ID`

## 2. Invita botul pe server

Mergi la **OAuth2 → URL Generator**, bifeaza:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `View Channels, Send Messages, Manage Messages, Kick Members, Ban Members, Moderate Members, Manage Channels, Manage Roles, Connect, Speak`

**Nu bifa Administrator.** Deschide link-ul generat si adauga botul pe serverul tau.

Important: dupa ce botul e pe server, du-te in **Server Settings → Roles** si trage rolul botului **cat mai sus posibil** (dar sub rolul tau de owner), altfel nu va putea da ban/kick/timeout la useri cu roluri mai mari.

## 3. Instalare locala

```bash
cd discord-bot
npm install
cp .env.example .env
```

Deschide `.env` si completeaza:
```
DISCORD_TOKEN=tokenul_tau
CLIENT_ID=client_id_ul_tau
GUILD_ID=id_ul_serverului_de_test  (click dreapta pe server > Copy Server ID, cu Developer Mode activat)
```

## 4. Inregistreaza comenzile slash

```bash
npm run deploy
```

Ruleaza asta de fiecare data cand adaugi/modifici o comanda.

## 5. Porneste botul

```bash
npm start
```

Daca vezi `✅ Bot pornit ca NumeleBotului#1234`, e gata.

## 6. Configurare pe server (prima data)

In Discord, ca owner/admin, ruleaza:

```
/setup security_log:#security-log mod_log:#mod-log voice_log:#voice-log trusted_role:@Moderator
```

Creeaza-ti in prealabil canalele `#security-log`, `#mod-log`, `#voice-log` (private, doar pt staff).

## Comenzi disponibile

**Moderare**
- `/ban user reason` — banneaza
- `/kick user reason` — da afara
- `/timeout user minutes reason` — mute temporar
- `/purge count` — sterge mesaje in masa

**Securitate (necesita owner sau trusted_role)**
- `/lockdown activate:true confirm:true` — activeaza lockdown manual
- `/lockdown activate:false confirm:true` — dezactiveaza
- `/emergency confirm:true` — opreste TOATE actiunile automate (kill switch)
- `/emergency-resume` — reactiveaza sistemul automat

**Muzica**
- `/play query` — reda o piesa (link YouTube sau nume)
- `/pause` `/resume` `/skip` `/stop` `/queue` `/volume level`

**Voice recording**
- `/record start` — porneste inregistrarea (anunta explicit in chat)
- `/record stop` — opreste si salveaza local

**General**
- `/ping` — verifica daca botul e online

## Ce face automat botul (fara comenzi)

- **Anti-raid**: daca 10+ useri intra in 10 secunde → lockdown automat + alerta in security log
- **Anti-nuke**: daca cineva face 5+ actiuni distructive (delete channel/role, ban, kick) in 15 secunde → ii sunt eliminate rolurile periculoase automat + alerta
- **Anti-spam**: mesaje repetate rapid sau mass-mention → timeout automat 5 minute + alerta

Toate astea se opresc instant daca rulezi `/emergency confirm:true`.

## Note importante despre VC recording

Inregistrarea audio implica legislatie de confidentialitate (in multe tari e nevoie de acordul participantilor). Botul anunta explicit in chat cand incepe inregistrarea — **nu elimina acest mesaj si nu folosi botul pentru inregistrare ascunsa**. Fisierele se salveaza local in format PCM brut; pentru redare ai nevoie de conversie cu ffmpeg (`ffmpeg -f s16le -ar 48000 -ac 2 -i input.pcm output.mp3`).

## Extindere

Structura e modulara — poti adauga comenzi noi punand fisiere in `commands/<categorie>/` si ruland din nou `npm run deploy`. Pentru productie serioasa, ia in calcul migrarea de la SQLite la PostgreSQL (vezi `utils/database.js`).
