# Terminal ile Supabase Tablolarını Yükleme

## Yöntem 1: Supabase CLI – migration’ları push et (önerilen)

Proje klasöründe, proje Supabase’e **link’li** olmalı.

```bat
cd C:\MOBIL_APP\project-bolt-sb1-tfztd1do\project
npx supabase db push
```

- İsterse **Database password** sorar: Supabase Dashboard → **Project Settings → Database** → **Database password** değerini gir (yazarken görünmez, Enter’a bas).
- `supabase/migrations/` altındaki tüm migration’lar sırayla remote DB’ye uygulanır.

Şifreyi her seferinde girmemek için (PowerShell):

```powershell
$env:PGPASSWORD = "BURAYA_DB_SIFRESI"
cd C:\MOBIL_APP\project-bolt-sb1-tfztd1do\project
npx supabase db push
```

---

## Yöntem 2: Tek SQL dosyası – psql ile

PostgreSQL komut satırı (`psql`) yüklüyse, tek dosyayı doğrudan çalıştırabilirsin.

```bat
cd C:\MOBIL_APP\project-bolt-sb1-tfztd1do\project
psql "postgresql://postgres.mhqdanpmutrlefwzjukz:SIFREN@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres" -f supabase_schema.sql
```

- `SIFREN` yerine **Database password** yaz (Dashboard → Project Settings → Database).
- `psql` yoksa: [PostgreSQL indir](https://www.postgresql.org/download/windows/) veya sadece **Yöntem 1** kullan.

---

## Link kontrolü

Proje link’li değilse:

```bat
cd C:\MOBIL_APP\project-bolt-sb1-tfztd1do\project
npx supabase link --project-ref mhqdanpmutrlefwzjukz
```

Sonra tekrar `npx supabase db push` çalıştır.
