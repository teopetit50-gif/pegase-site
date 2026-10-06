#!/usr/bin/env bash
# Assemble les tests TAVARO en un seul fichier pour le coordinateur : les fonctions de 00 à 11,
# puis un seul runtests('^test_b2_'). Les « select * from runtests(…) » de chaque fichier sont retirés.
# usage : bash omega/tests/tavaro/assembler.sh   → omega/tests/tavaro/TOUT_B2.sql
cd "$(dirname "$0")"
{
  echo "-- TOUT_B2.sql — les tests pgTAP du module TAVARO (session B2), assemblés par assembler.sh."
  echo "-- Prérequis : omega/tests/socle/00_installation.sql (A5) déjà joué ; migrations b2_01 à b2_05 posées."
  echo "-- Un seul appel execute_sql sur la RECETTE ; runtests() annule tout ce que les tests écrivent."
  echo
  for f in 00_jeu_tavaro.sql $(ls [0-9][0-9]_*.sql | grep -v '^00_'); do
    echo "-- ═══════════════════════════ $f"
    grep -v "^select \* from runtests(" "$f"
    echo
  done
  echo "select * from runtests('tests'::name, '^test_b2_');"
} > TOUT_B2.sql
echo "TOUT_B2.sql : $(wc -c < TOUT_B2.sql) octets, $(grep -c 'create or replace function tests.test_b2_' TOUT_B2.sql) tests"
