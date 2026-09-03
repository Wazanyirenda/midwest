-- Removes the show_crypto_payment setting.
--
-- Checkout has no crypto option to show or hide — the NOWPayments integration
-- (Phase 06) is designed but not built. A toggle that changes nothing is worse
-- than no toggle: the owner flips it, sees no effect, and stops trusting the
-- settings page. Re-add it in the same migration that ships crypto checkout.

delete from site_settings where key = 'show_crypto_payment';
