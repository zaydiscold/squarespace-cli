#!/usr/bin/env node
import { Command } from "commander";
import { ordersCommand } from "./commands/orders.js";
import { productsCommand } from "./commands/products.js";
import { inventoryCommand } from "./commands/inventory.js";
import { transactionsCommand } from "./commands/transactions.js";
import { contactsCommand } from "./commands/contacts.js";
import { webhooksCommand } from "./commands/webhooks.js";
import { accountCommand } from "./commands/account.js";
import { domainsCommand } from "./commands/domains.js";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("squarespace-cli")
    .description(
      "Squarespace Commerce + account/domains from the terminal. Commerce uses SQUARESPACE_API_KEY; account/domain reads use SQUARESPACE_COOKIE. Writes default to dry-run."
    )
    .version("0.1.0");

  program.addCommand(ordersCommand());
  program.addCommand(productsCommand());
  program.addCommand(inventoryCommand());
  program.addCommand(transactionsCommand());
  program.addCommand(contactsCommand());
  program.addCommand(webhooksCommand());
  program.addCommand(accountCommand());
  program.addCommand(domainsCommand());

  return program;
}

async function main(): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

void main();
