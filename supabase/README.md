# Fourcred V2 — Infraestrutura de Integração & Automação Supabase PostgreSQL

Este diretório contém a infraestrutura completa de **automação, migrations versionadas e CLI do Supabase PostgreSQL** para a aplicação **Fourcred V2**.

---

## 🏗️ Estrutura da Infraestrutura

```
/supabase
├── config.toml                     # Configuração do Supabase CLI
├── seed.sql                        # Dados de demonstração idempotentes
├── schema.sql                      # Script consolidado completo
└── migrations/                     # Migrations SQL versionadas
    ├── 20261108000001_create_cadastros_table.sql
    ├── 20261108000002_create_administradores_and_historico.sql
    ├── 20261108000003_create_indexes_views_functions.sql
    └── 20261108000004_create_rls_policies.sql
```

---

## 🤖 Automação via GitHub Actions (CI/CD)

Toda alteração de banco é validada e aplicável via GitHub Actions no arquivo `.github/workflows/supabase-deploy.yml`.

### 🔑 Repository Secrets Necessárias no GitHub:
Configure em `Settings -> Secrets and variables -> Actions` no seu repositório:

| Secret | Descrição |
| :--- | :--- |
| `SUPABASE_ACCESS_TOKEN` | Token de acesso de CLI gerado no painel Supabase (Account -> Access Tokens). |
| `SUPABASE_DB_PASSWORD` | Senha do banco PostgreSQL do seu projeto Supabase. |
| `SUPABASE_PROJECT_REF` | ID de referência do seu projeto Supabase (ex: `p3fvg424ortpxklbw37uoo`). |

---

## 💻 Comandos CLI para Desenvolvedores

No ambiente local ou no terminal, utilize os comandos cadastrados no `package.json`:

```bash
# 1. Inspecionar e validar as migrations locais
npm run db:inspect

# 2. Verificar sintaxe e linting das migrations
npm run db:lint

# 3. Aplicar todas as migrations pendentes no banco Supabase
npm run db:push

# 4. Verificar o status da instância Supabase
npm run db:status
```

---

## 🔒 Segurança & Políticas Row Level Security (RLS)

- **`cadastros`**:
  - `INSERT`: Liberado para o público (`anon` e `authenticated`) para recepção do formulário web.
  - `SELECT`, `UPDATE`, `DELETE`: Estritamente restritos a administradores autenticados com flag `ativo = true` em `public.administradores`.
- **`administradores`** e **`historico_acessos`**:
  - Restritos estritamente a administradores autenticados e autorizados.

---

## 🛡️ Idempotência e Preservação de Dados

1. **Sem Operações Destrutivas**: As migrations usam `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` e `DROP POLICY IF EXISTS`. Nenhuma migration exclui tabelas ou limpa registros em produção.
2. **Pre-Flight Validation**: O GitHub Actions executa uma etapa de `dry-run` para validar o plano de execução SQL antes da aplicação definitiva.

---

## 📦 Procedimento de Backup e Recuperação

### Backup Preventivo
```bash
# Backup via pg_dump
pg_dump -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres -F c -b -v -f backup_fourcred_$(date +%Y%m%d_%H%M%S).dump

# Backup via Supabase CLI
supabase db dump --project-ref <PROJECT_REF> -f supabase_backup.sql
```

### Restauração em Emergência
```bash
pg_restore -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres -v --clean backup_fourcred_YYYYMMDD_HHMMSS.dump
```
