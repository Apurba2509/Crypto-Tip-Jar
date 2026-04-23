#![no_std]

// Import necessary types from the Soroban SDK
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Vec, Symbol, vec,
    symbol_short,
};

// ─── Data Structures ──────────────────────────────────────────────────────────

/// Represents a single tip entry stored on-chain.
/// Each tip records who sent it and how much (in stroops, 1 XLM = 10_000_000 stroops).
#[contracttype]
#[derive(Clone, Debug)]
pub struct TipEntry {
    /// The Stellar address of the tipper
    pub tipper: Address,
    /// The tip amount in stroops (i128 to match Stellar's native asset precision)
    pub amount: i128,
}

// ─── Storage Key ──────────────────────────────────────────────────────────────

/// Short symbol used as the persistent storage key for the tips vector.
/// Using symbol_short! keeps the key compact (≤8 chars).
const TIPS_KEY: Symbol = symbol_short!("TIPS");

// ─── Contract Definition ──────────────────────────────────────────────────────

/// The TipJar contract — stores and retrieves XLM tips on Stellar Soroban.
#[contract]
pub struct TipJarContract;

#[contractimpl]
impl TipJarContract {
    /// `tip` — Record a new tip in persistent contract storage.
    ///
    /// # Arguments
    /// * `env`    — The Soroban execution environment (injected automatically).
    /// * `tipper` — The Stellar address of the person sending the tip.
    /// * `amount` — The tip amount in stroops (1 XLM = 10_000_000 stroops).
    ///
    /// # Behaviour
    /// - Requires the tipper to authorize the call (prevents spoofing).
    /// - Reads the existing tips Vec from storage (or creates an empty one).
    /// - Appends the new TipEntry and writes it back to storage.
    pub fn tip(env: Env, tipper: Address, amount: i128) {
        // Ensure the tipper's Freighter wallet has actually authorized this call.
        // Without this, anyone could submit a tip on someone else's behalf.
        tipper.require_auth();

        // Validate that the tip amount is positive
        if amount <= 0 {
            panic!("Tip amount must be greater than zero");
        }

        // Load the existing tips vector from persistent storage.
        // If this is the very first tip, start with an empty Vec.
        let mut tips: Vec<TipEntry> = env
            .storage()
            .persistent()
            .get(&TIPS_KEY)
            .unwrap_or_else(|| vec![&env]);

        // Create a new tip entry from the provided data
        let entry = TipEntry {
            tipper: tipper.clone(),
            amount,
        };

        // Append the new tip to the history
        tips.push_back(entry);

        // Persist the updated tips vector back into contract storage.
        // `persistent` storage survives across transactions indefinitely
        // (subject to rent, but fine for hackathon use).
        env.storage().persistent().set(&TIPS_KEY, &tips);

        // Emit an event so frontends can listen via horizon/RPC
        env.events().publish(
            (symbol_short!("tip"), tipper),
            amount,
        );
    }

    /// `get_tips` — Return the full tip history stored in the contract.
    ///
    /// # Returns
    /// A `Vec<TipEntry>` containing every recorded tip (address + amount).
    /// Returns an empty Vec if no tips have been sent yet.
    ///
    /// # Notes
    /// This is a read-only view — it does not mutate state.
    pub fn get_tips(env: Env) -> Vec<TipEntry> {
        // Read and return the tips vector; return empty Vec if nothing stored yet
        env.storage()
            .persistent()
            .get(&TIPS_KEY)
            .unwrap_or_else(|| vec![&env])
    }

    /// `clear_tips` — (Admin utility) Wipe all tips from storage.
    ///
    /// Useful during development/testing. In production you'd gate
    /// this behind an admin address check.
    pub fn clear_tips(env: Env) {
        env.storage().persistent().remove(&TIPS_KEY);
    }
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_tip_and_get() {
        let env = Env::default();
        env.mock_all_auths(); // Skip real auth in tests

        let contract_id = env.register_contract(None, TipJarContract);
        let client = TipJarContractClient::new(&env, &contract_id);

        // Create a mock address for the tipper
        let tipper = Address::generate(&env);
        let amount: i128 = 5_000_000; // 0.5 XLM in stroops

        // Send a tip
        client.tip(&tipper, &amount);

        // Retrieve tips and verify
        let tips = client.get_tips();
        assert_eq!(tips.len(), 1);
        assert_eq!(tips.get(0).unwrap().amount, amount);
    }

    #[test]
    fn test_multiple_tips() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TipJarContract);
        let client = TipJarContractClient::new(&env, &contract_id);

        let tipper1 = Address::generate(&env);
        let tipper2 = Address::generate(&env);

        client.tip(&tipper1, &10_000_000i128); // 1 XLM
        client.tip(&tipper2, &20_000_000i128); // 2 XLM

        let tips = client.get_tips();
        assert_eq!(tips.len(), 2);
        assert_eq!(tips.get(1).unwrap().amount, 20_000_000);
    }

    #[test]
    #[should_panic(expected = "Tip amount must be greater than zero")]
    fn test_zero_tip_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TipJarContract);
        let client = TipJarContractClient::new(&env, &contract_id);

        let tipper = Address::generate(&env);
        client.tip(&tipper, &0i128); // Should panic
    }
}
