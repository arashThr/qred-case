import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.text('id').primary()
    t.text('name').notNullable()
  })

  await knex.schema.createTable('companies', (t) => {
    t.text('id').primary()
    t.text('name').notNullable()
  })

  await knex.schema.createTable('memberships', (t) => {
    t.text('user_id').notNullable().references('users.id')
    t.text('company_id').notNullable().references('companies.id')
    t.enu('role', ['owner', 'admin', 'member']).notNullable()
    t.primary(['user_id', 'company_id'])
  })

  await knex.schema.createTable('cards', (t) => {
    t.text('id').primary()
    t.text('company_id').notNullable().references('companies.id')
    t.enu('status', ['pending_activation', 'active', 'blocked']).notNullable()
    t.enu('brand', ['VISA']).notNullable()
    t.string('last4', 4).notNullable().checkRegex('^[0-9]{4}$')
    t.timestamp('issued_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
    t.timestamp('activated_at', { useTz: true })
    t.index(['company_id', 'issued_at'])
  })

  await knex.schema.createTable('spend_limits', (t) => {
    t.text('company_id').primary().references('companies.id')
    t.integer('amount_minor').notNullable().checkPositive()
    t.string('currency', 3).notNullable()
    t.enu('basis', ['user_set_limit', 'credit_limit']).notNullable()
  })

  await knex.schema.createTable('invoices', (t) => {
    t.text('id').primary()
    t.text('company_id').notNullable().references('companies.id')
    t.date('period_start').notNullable()
    t.date('period_end').notNullable()
    t.date('due_date').notNullable()
    t.integer('amount_minor').notNullable()
    t.string('currency', 3).notNullable()
    t.enu('status', ['due', 'overdue', 'paid']).notNullable()
    t.index(['company_id', 'status', 'due_date'])
  })

  await knex.schema.createTable('transactions', (t) => {
    t.text('id').primary()
    t.text('company_id').notNullable().references('companies.id')
    t.text('card_id').notNullable().references('cards.id')
    t.integer('amount_minor').notNullable()
    t.string('currency', 3).notNullable()
    t.text('merchant').notNullable()
    t.timestamp('occurred_at', { useTz: true }).notNullable()
    t.enu('status', ['pending', 'settled']).notNullable()
    t.text('invoice_id').references('invoices.id')
    t.index(['company_id', 'occurred_at', 'id'])
    t.index(['invoice_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .dropTable('transactions')
    .dropTable('invoices')
    .dropTable('spend_limits')
    .dropTable('cards')
    .dropTable('memberships')
    .dropTable('companies')
    .dropTable('users')
}
