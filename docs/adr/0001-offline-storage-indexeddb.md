# Offline Storage Strategy via IndexedDB (Dexie.js)

PRD §5 specifies an offline-first kiosk targeting tablet/laptop browsers with an eventual cloud backend. We decided to implement the local data store using Dexie.js (IndexedDB) with a relational abstraction layer and UUID primary keys, rather than requiring an embedded SQLite engine or native compilation. This allows the Next.js PWA to run immediately in any modern tablet browser (Chrome, Safari, iPad) with zero build friction, while preserving strict relational schema compatibility for future SQLite or Supabase cloud sync.
