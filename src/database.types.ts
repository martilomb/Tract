export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      accruals: {
        Row: {
          active: boolean;
          approved_adjustments: number;
          approved_recoverable_cost: number;
          created_at: string;
          dcr_id: string | null;
          department_id: string | null;
          id: string;
          organization_id: string;
          part_id: string;
          program_id: string;
          recovery_agreement_id: string | null;
          recovery_policy_configuration_id: string;
          settlement_currency: string;
          technical_team_id: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          approved_adjustments?: number;
          approved_recoverable_cost: number;
          created_at?: string;
          dcr_id?: string | null;
          department_id?: string | null;
          id?: string;
          organization_id: string;
          part_id: string;
          program_id: string;
          recovery_agreement_id?: string | null;
          recovery_policy_configuration_id: string;
          settlement_currency: string;
          technical_team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          approved_adjustments?: number;
          approved_recoverable_cost?: number;
          created_at?: string;
          dcr_id?: string | null;
          department_id?: string | null;
          id?: string;
          organization_id?: string;
          part_id?: string;
          program_id?: string;
          recovery_agreement_id?: string | null;
          recovery_policy_configuration_id?: string;
          settlement_currency?: string;
          technical_team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accrual_recovery_agreement_same_tenant";
            columns: ["organization_id", "recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "accruals_dcr_id_fkey";
            columns: ["dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accruals_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accruals_organization_id_dcr_id_fkey";
            columns: ["organization_id", "dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "accruals_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accruals_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "accruals_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "accruals_organization_id_recovery_policy_configuration_id_fkey";
            columns: ["organization_id", "recovery_policy_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "accruals_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accruals_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accruals_recovery_agreement_id_fkey";
            columns: ["recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accruals_recovery_policy_configuration_id_fkey";
            columns: ["recovery_policy_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accruals_technical_team_id_fkey";
            columns: ["technical_team_id"];
            isOneToOne: false;
            referencedRelation: "technical_teams";
            referencedColumns: ["id"];
          },
        ];
      };
      approvals: {
        Row: {
          approver_user_id: string | null;
          created_at: string;
          decided_at: string | null;
          decision: string;
          entity_id: string;
          entity_type: string;
          id: string;
          organization_id: string;
          reason: string | null;
          stage: string;
        };
        Insert: {
          approver_user_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decision: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          organization_id: string;
          reason?: string | null;
          stage: string;
        };
        Update: {
          approver_user_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decision?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          organization_id?: string;
          reason?: string | null;
          stage?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approvals_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          after_state: Json | null;
          before_state: Json | null;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: Json;
          occurred_at: string;
          organization_id: string;
          request_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_state?: Json | null;
          before_state?: Json | null;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          metadata?: Json;
          occurred_at?: string;
          organization_id: string;
          request_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_state?: Json | null;
          before_state?: Json | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          metadata?: Json;
          occurred_at?: string;
          organization_id?: string;
          request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      calculation_lines: {
        Row: {
          calculation_run_id: string;
          id: number;
          organization_id: string;
          per_unit_rate: number;
          recovered_amount: number;
          recovery_rate_period_id: string;
          signed_eligible_units: number;
          volume_event_id: string;
        };
        Insert: {
          calculation_run_id: string;
          id?: never;
          organization_id: string;
          per_unit_rate: number;
          recovered_amount: number;
          recovery_rate_period_id: string;
          signed_eligible_units: number;
          volume_event_id: string;
        };
        Update: {
          calculation_run_id?: string;
          id?: never;
          organization_id?: string;
          per_unit_rate?: number;
          recovered_amount?: number;
          recovery_rate_period_id?: string;
          signed_eligible_units?: number;
          volume_event_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calculation_lines_calculation_run_id_fkey";
            columns: ["calculation_run_id"];
            isOneToOne: false;
            referencedRelation: "calculation_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculation_lines_organization_id_calculation_run_id_fkey";
            columns: ["organization_id", "calculation_run_id"];
            isOneToOne: false;
            referencedRelation: "calculation_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "calculation_lines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculation_lines_organization_id_volume_event_id_fkey";
            columns: ["organization_id", "volume_event_id"];
            isOneToOne: false;
            referencedRelation: "volume_events";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "calculation_lines_recovery_rate_period_id_fkey";
            columns: ["recovery_rate_period_id"];
            isOneToOne: false;
            referencedRelation: "recovery_rate_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculation_lines_volume_event_id_fkey";
            columns: ["volume_event_id"];
            isOneToOne: false;
            referencedRelation: "volume_events";
            referencedColumns: ["id"];
          },
        ];
      };
      calculation_results: {
        Row: {
          calculation_run_id: string;
          created_at: string;
          id: string;
          organization_id: string;
          over_recovery: number;
          recovered_amount: number;
          remaining_amount: number;
          settlement_currency: string;
          under_recovery: number;
        };
        Insert: {
          calculation_run_id: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          over_recovery: number;
          recovered_amount: number;
          remaining_amount: number;
          settlement_currency: string;
          under_recovery: number;
        };
        Update: {
          calculation_run_id?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          over_recovery?: number;
          recovered_amount?: number;
          remaining_amount?: number;
          settlement_currency?: string;
          under_recovery?: number;
        };
        Relationships: [
          {
            foreignKeyName: "calculation_results_calculation_run_id_fkey";
            columns: ["calculation_run_id"];
            isOneToOne: true;
            referencedRelation: "calculation_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculation_results_organization_id_calculation_run_id_fkey";
            columns: ["organization_id", "calculation_run_id"];
            isOneToOne: false;
            referencedRelation: "calculation_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "calculation_results_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      calculation_runs: {
        Row: {
          accrual_id: string;
          as_of_date: string;
          completed_at: string | null;
          created_at: string;
          error_code: string | null;
          error_detail: string | null;
          id: string;
          initiated_by: string | null;
          input_hash: string;
          organization_id: string;
          policy_configuration_id: string;
          started_at: string | null;
          status: Database["public"]["Enums"]["job_status"];
        };
        Insert: {
          accrual_id: string;
          as_of_date: string;
          completed_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          error_detail?: string | null;
          id?: string;
          initiated_by?: string | null;
          input_hash: string;
          organization_id: string;
          policy_configuration_id: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
        };
        Update: {
          accrual_id?: string;
          as_of_date?: string;
          completed_at?: string | null;
          created_at?: string;
          error_code?: string | null;
          error_detail?: string | null;
          id?: string;
          initiated_by?: string | null;
          input_hash?: string;
          organization_id?: string;
          policy_configuration_id?: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
        };
        Relationships: [
          {
            foreignKeyName: "calculation_runs_accrual_id_fkey";
            columns: ["accrual_id"];
            isOneToOne: false;
            referencedRelation: "accruals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculation_runs_organization_id_accrual_id_fkey";
            columns: ["organization_id", "accrual_id"];
            isOneToOne: false;
            referencedRelation: "accruals";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "calculation_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calculation_runs_policy_configuration_id_fkey";
            columns: ["policy_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      commodities: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commodities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      configuration_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          effective_from: string;
          id: string;
          kind: Database["public"]["Enums"]["configuration_kind"];
          organization_id: string;
          payload: Json;
          status: Database["public"]["Enums"]["configuration_status"];
          supersedes_id: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          effective_from: string;
          id?: string;
          kind: Database["public"]["Enums"]["configuration_kind"];
          organization_id: string;
          payload: Json;
          status?: Database["public"]["Enums"]["configuration_status"];
          supersedes_id?: string | null;
          version: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["configuration_kind"];
          organization_id?: string;
          payload?: Json;
          status?: Database["public"]["Enums"]["configuration_status"];
          supersedes_id?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "configuration_versions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "configuration_versions_organization_id_supersedes_id_fkey";
            columns: ["organization_id", "supersedes_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "configuration_versions_supersedes_id_fkey";
            columns: ["supersedes_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      connector_mapping_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          connector_id: string;
          created_at: string;
          field_mappings: Json;
          id: string;
          organization_id: string;
          owner_user_id: string | null;
          reconciliation_preview: Json;
          sample_validation: Json;
          status: string;
          supersedes_id: string | null;
          version: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          connector_id: string;
          created_at?: string;
          field_mappings: Json;
          id?: string;
          organization_id: string;
          owner_user_id?: string | null;
          reconciliation_preview?: Json;
          sample_validation?: Json;
          status?: string;
          supersedes_id?: string | null;
          version: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          connector_id?: string;
          created_at?: string;
          field_mappings?: Json;
          id?: string;
          organization_id?: string;
          owner_user_id?: string | null;
          reconciliation_preview?: Json;
          sample_validation?: Json;
          status?: string;
          supersedes_id?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "connector_mapping_versions_connector_id_fkey";
            columns: ["connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connector_mapping_versions_organization_id_connector_id_fkey";
            columns: ["organization_id", "connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "connector_mapping_versions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connector_mapping_versions_organization_id_supersedes_id_fkey";
            columns: ["organization_id", "supersedes_id"];
            isOneToOne: false;
            referencedRelation: "connector_mapping_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "connector_mapping_versions_supersedes_id_fkey";
            columns: ["supersedes_id"];
            isOneToOne: false;
            referencedRelation: "connector_mapping_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      connector_test_runs: {
        Row: {
          attempted_by: string | null;
          completed_at: string | null;
          configuration_hash: string | null;
          connector_id: string;
          created_at: string;
          endpoint_host: string | null;
          id: string;
          mapping_version_id: string | null;
          mode: string;
          organization_id: string;
          result_summary: Json;
          started_at: string;
          status: string;
        };
        Insert: {
          attempted_by?: string | null;
          completed_at?: string | null;
          configuration_hash?: string | null;
          connector_id: string;
          created_at?: string;
          endpoint_host?: string | null;
          id?: string;
          mapping_version_id?: string | null;
          mode: string;
          organization_id: string;
          result_summary?: Json;
          started_at?: string;
          status?: string;
        };
        Update: {
          attempted_by?: string | null;
          completed_at?: string | null;
          configuration_hash?: string | null;
          connector_id?: string;
          created_at?: string;
          endpoint_host?: string | null;
          id?: string;
          mapping_version_id?: string | null;
          mode?: string;
          organization_id?: string;
          result_summary?: Json;
          started_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connector_test_runs_connector_id_fkey";
            columns: ["connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connector_test_runs_mapping_version_id_fkey";
            columns: ["mapping_version_id"];
            isOneToOne: false;
            referencedRelation: "connector_mapping_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connector_test_runs_organization_id_connector_id_fkey";
            columns: ["organization_id", "connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "connector_test_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connector_test_runs_organization_id_mapping_version_id_fkey";
            columns: ["organization_id", "mapping_version_id"];
            isOneToOne: false;
            referencedRelation: "connector_mapping_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      connectors: {
        Row: {
          activation_state: string;
          adapter_type: string;
          allowed_hosts: string[];
          authentication_method: string;
          created_at: string;
          credential_reference: string | null;
          data_categories: Database["public"]["Enums"]["erp_transaction_type"][];
          delta_behavior: Json;
          documentation_reference: string | null;
          enabled: boolean;
          endpoint_url: string | null;
          environment: string;
          health_state: string;
          id: string;
          ingestion_domain: Database["public"]["Enums"]["ingestion_domain"] | null;
          last_error_code: string | null;
          last_error_detail: string | null;
          last_run_at: string | null;
          license_reference: string | null;
          manual_runs_enabled: boolean;
          mapping_configuration_id: string | null;
          name: string;
          next_run_at: string | null;
          organization_id: string;
          owner_user_id: string | null;
          provider_key: string;
          reconciliation_rules: Json;
          retry_policy: Json;
          sample_reference: string | null;
          schedule: string | null;
          source_objects: Json;
          supported_transports: Database["public"]["Enums"]["ingestion_transport"][];
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          activation_state?: string;
          adapter_type: string;
          allowed_hosts?: string[];
          authentication_method?: string;
          created_at?: string;
          credential_reference?: string | null;
          data_categories?: Database["public"]["Enums"]["erp_transaction_type"][];
          delta_behavior?: Json;
          documentation_reference?: string | null;
          enabled?: boolean;
          endpoint_url?: string | null;
          environment?: string;
          health_state?: string;
          id?: string;
          ingestion_domain?: Database["public"]["Enums"]["ingestion_domain"] | null;
          last_error_code?: string | null;
          last_error_detail?: string | null;
          last_run_at?: string | null;
          license_reference?: string | null;
          manual_runs_enabled?: boolean;
          mapping_configuration_id?: string | null;
          name: string;
          next_run_at?: string | null;
          organization_id: string;
          owner_user_id?: string | null;
          provider_key?: string;
          reconciliation_rules?: Json;
          retry_policy?: Json;
          sample_reference?: string | null;
          schedule?: string | null;
          source_objects?: Json;
          supported_transports?: Database["public"]["Enums"]["ingestion_transport"][];
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          activation_state?: string;
          adapter_type?: string;
          allowed_hosts?: string[];
          authentication_method?: string;
          created_at?: string;
          credential_reference?: string | null;
          data_categories?: Database["public"]["Enums"]["erp_transaction_type"][];
          delta_behavior?: Json;
          documentation_reference?: string | null;
          enabled?: boolean;
          endpoint_url?: string | null;
          environment?: string;
          health_state?: string;
          id?: string;
          ingestion_domain?: Database["public"]["Enums"]["ingestion_domain"] | null;
          last_error_code?: string | null;
          last_error_detail?: string | null;
          last_run_at?: string | null;
          license_reference?: string | null;
          manual_runs_enabled?: boolean;
          mapping_configuration_id?: string | null;
          name?: string;
          next_run_at?: string | null;
          organization_id?: string;
          owner_user_id?: string | null;
          provider_key?: string;
          reconciliation_rules?: Json;
          retry_policy?: Json;
          sample_reference?: string | null;
          schedule?: string | null;
          source_objects?: Json;
          supported_transports?: Database["public"]["Enums"]["ingestion_transport"][];
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connectors_mapping_configuration_id_fkey";
            columns: ["mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connectors_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connectors_organization_id_mapping_configuration_id_fkey";
            columns: ["organization_id", "mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      contacts: {
        Row: {
          created_at: string;
          display_name: string;
          email: string | null;
          id: string;
          invited_user_id: string | null;
          oem_id: string | null;
          organization_id: string;
          supplier_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email?: string | null;
          id?: string;
          invited_user_id?: string | null;
          oem_id?: string | null;
          organization_id: string;
          supplier_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string | null;
          id?: string;
          invited_user_id?: string | null;
          oem_id?: string | null;
          organization_id?: string;
          supplier_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_oem_same_tenant";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "contacts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_supplier_same_tenant";
            columns: ["organization_id", "supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      dcr_assignments: {
        Row: {
          active: boolean;
          assigned_by: string | null;
          assigned_user_id: string;
          created_at: string;
          dcr_id: string;
          id: string;
          organization_id: string;
          role: string;
        };
        Insert: {
          active?: boolean;
          assigned_by?: string | null;
          assigned_user_id: string;
          created_at?: string;
          dcr_id: string;
          id?: string;
          organization_id: string;
          role: string;
        };
        Update: {
          active?: boolean;
          assigned_by?: string | null;
          assigned_user_id?: string;
          created_at?: string;
          dcr_id?: string;
          id?: string;
          organization_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dcr_assignments_dcr_id_fkey";
            columns: ["dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcr_assignments_organization_id_dcr_id_fkey";
            columns: ["organization_id", "dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_assignments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      dcr_comments: {
        Row: {
          author_user_id: string | null;
          body: string;
          created_at: string;
          dcr_id: string;
          edited_at: string | null;
          id: string;
          organization_id: string;
        };
        Insert: {
          author_user_id?: string | null;
          body: string;
          created_at?: string;
          dcr_id: string;
          edited_at?: string | null;
          id?: string;
          organization_id: string;
        };
        Update: {
          author_user_id?: string | null;
          body?: string;
          created_at?: string;
          dcr_id?: string;
          edited_at?: string | null;
          id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dcr_comments_dcr_id_fkey";
            columns: ["dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcr_comments_organization_id_dcr_id_fkey";
            columns: ["organization_id", "dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_comments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      dcr_parts: {
        Row: {
          created_at: string;
          dcr_id: string;
          organization_id: string;
          part_id: string;
        };
        Insert: {
          created_at?: string;
          dcr_id: string;
          organization_id: string;
          part_id: string;
        };
        Update: {
          created_at?: string;
          dcr_id?: string;
          organization_id?: string;
          part_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dcr_parts_dcr_id_fkey";
            columns: ["dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcr_parts_organization_id_dcr_id_fkey";
            columns: ["organization_id", "dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_parts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcr_parts_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_parts_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
        ];
      };
      dcr_status_history: {
        Row: {
          actor_id: string | null;
          dcr_id: string;
          from_status: Database["public"]["Enums"]["dcr_status"];
          id: number;
          occurred_at: string;
          organization_id: string;
          reason: string | null;
          to_status: Database["public"]["Enums"]["dcr_status"];
          workflow_configuration_id: string;
        };
        Insert: {
          actor_id?: string | null;
          dcr_id: string;
          from_status: Database["public"]["Enums"]["dcr_status"];
          id?: never;
          occurred_at?: string;
          organization_id: string;
          reason?: string | null;
          to_status: Database["public"]["Enums"]["dcr_status"];
          workflow_configuration_id: string;
        };
        Update: {
          actor_id?: string | null;
          dcr_id?: string;
          from_status?: Database["public"]["Enums"]["dcr_status"];
          id?: never;
          occurred_at?: string;
          organization_id?: string;
          reason?: string | null;
          to_status?: Database["public"]["Enums"]["dcr_status"];
          workflow_configuration_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dcr_status_history_dcr_id_fkey";
            columns: ["dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcr_status_history_organization_id_dcr_id_fkey";
            columns: ["organization_id", "dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_status_history_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcr_status_history_workflow_configuration_id_fkey";
            columns: ["workflow_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      dcrs: {
        Row: {
          approved_adjustments: number;
          approved_at: string | null;
          approved_recoverable_cost: number;
          closed_at: string | null;
          comments_summary: string | null;
          created_at: string;
          dcr_number: string;
          department_id: string | null;
          ed_and_t_amount: number | null;
          engineer_contact_id: string | null;
          id: string;
          initiator_user_id: string;
          module_component: string | null;
          organization_id: string;
          part_id: string | null;
          piece_price_impact: number | null;
          program_id: string | null;
          salesperson_contact_id: string | null;
          settlement_currency: string;
          stated_volume: number | null;
          status: Database["public"]["Enums"]["dcr_status"];
          submitted_at: string | null;
          supplier_id: string | null;
          technical_team_id: string | null;
          title: string;
          transition_reason: string | null;
          updated_at: string;
          workflow_configuration_id: string;
        };
        Insert: {
          approved_adjustments?: number;
          approved_at?: string | null;
          approved_recoverable_cost?: number;
          closed_at?: string | null;
          comments_summary?: string | null;
          created_at?: string;
          dcr_number: string;
          department_id?: string | null;
          ed_and_t_amount?: number | null;
          engineer_contact_id?: string | null;
          id?: string;
          initiator_user_id: string;
          module_component?: string | null;
          organization_id: string;
          part_id?: string | null;
          piece_price_impact?: number | null;
          program_id?: string | null;
          salesperson_contact_id?: string | null;
          settlement_currency: string;
          stated_volume?: number | null;
          status?: Database["public"]["Enums"]["dcr_status"];
          submitted_at?: string | null;
          supplier_id?: string | null;
          technical_team_id?: string | null;
          title: string;
          transition_reason?: string | null;
          updated_at?: string;
          workflow_configuration_id: string;
        };
        Update: {
          approved_adjustments?: number;
          approved_at?: string | null;
          approved_recoverable_cost?: number;
          closed_at?: string | null;
          comments_summary?: string | null;
          created_at?: string;
          dcr_number?: string;
          department_id?: string | null;
          ed_and_t_amount?: number | null;
          engineer_contact_id?: string | null;
          id?: string;
          initiator_user_id?: string;
          module_component?: string | null;
          organization_id?: string;
          part_id?: string | null;
          piece_price_impact?: number | null;
          program_id?: string | null;
          salesperson_contact_id?: string | null;
          settlement_currency?: string;
          stated_volume?: number | null;
          status?: Database["public"]["Enums"]["dcr_status"];
          submitted_at?: string | null;
          supplier_id?: string | null;
          technical_team_id?: string | null;
          title?: string;
          transition_reason?: string | null;
          updated_at?: string;
          workflow_configuration_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dcr_department_same_tenant";
            columns: ["organization_id", "department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_engineer_same_tenant";
            columns: ["organization_id", "engineer_contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_part_same_tenant";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_program_same_tenant";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_salesperson_same_tenant";
            columns: ["organization_id", "salesperson_contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_supplier_same_tenant";
            columns: ["organization_id", "supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_team_same_tenant";
            columns: ["organization_id", "technical_team_id"];
            isOneToOne: false;
            referencedRelation: "technical_teams";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcr_workflow_same_tenant";
            columns: ["organization_id", "workflow_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "dcrs_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcrs_engineer_contact_id_fkey";
            columns: ["engineer_contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcrs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcrs_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcrs_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcrs_salesperson_contact_id_fkey";
            columns: ["salesperson_contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcrs_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcrs_technical_team_id_fkey";
            columns: ["technical_team_id"];
            isOneToOne: false;
            referencedRelation: "technical_teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dcrs_workflow_configuration_id_fkey";
            columns: ["workflow_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      document_term_postings: {
        Row: {
          destination_field: string;
          destination_id: string;
          destination_type: string;
          extraction_field_candidate_id: string;
          id: string;
          organization_id: string;
          posted_at: string;
          posted_by: string | null;
        };
        Insert: {
          destination_field: string;
          destination_id: string;
          destination_type: string;
          extraction_field_candidate_id: string;
          id?: string;
          organization_id: string;
          posted_at?: string;
          posted_by?: string | null;
        };
        Update: {
          destination_field?: string;
          destination_id?: string;
          destination_type?: string;
          extraction_field_candidate_id?: string;
          id?: string;
          organization_id?: string;
          posted_at?: string;
          posted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_term_postings_extraction_field_candidate_id_fkey";
            columns: ["extraction_field_candidate_id"];
            isOneToOne: false;
            referencedRelation: "extraction_field_candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_term_postings_organization_id_extraction_field_ca_fkey";
            columns: ["organization_id", "extraction_field_candidate_id"];
            isOneToOne: false;
            referencedRelation: "extraction_field_candidates";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "document_term_postings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      document_versions: {
        Row: {
          document_id: string;
          id: string;
          mime_type: string;
          organization_id: string;
          sha256: string;
          size_bytes: number;
          storage_path: string;
          uploaded_at: string;
          uploaded_by: string | null;
          version: number;
        };
        Insert: {
          document_id: string;
          id?: string;
          mime_type: string;
          organization_id: string;
          sha256: string;
          size_bytes: number;
          storage_path: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
          version: number;
        };
        Update: {
          document_id?: string;
          id?: string;
          mime_type?: string;
          organization_id?: string;
          sha256?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_versions_organization_id_document_id_fkey";
            columns: ["organization_id", "document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "document_versions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          created_at: string;
          created_by: string | null;
          dcr_id: string | null;
          document_type: string;
          id: string;
          organization_id: string;
          recovery_agreement_id: string | null;
          status: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          dcr_id?: string | null;
          document_type: string;
          id?: string;
          organization_id: string;
          recovery_agreement_id?: string | null;
          status?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          dcr_id?: string | null;
          document_type?: string;
          id?: string;
          organization_id?: string;
          recovery_agreement_id?: string | null;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_dcr_id_fkey";
            columns: ["dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_organization_id_dcr_id_fkey";
            columns: ["organization_id", "dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "documents_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_recovery_agreement_id_fkey";
            columns: ["recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_recovery_agreement_same_tenant";
            columns: ["organization_id", "recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      eligible_volume_policies: {
        Row: {
          accrual_id: string;
          approved_at: string | null;
          approved_by: string | null;
          basis: Database["public"]["Enums"]["eligible_volume_basis"];
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          organization_id: string;
          policy_configuration_id: string;
          status: string;
        };
        Insert: {
          accrual_id: string;
          approved_at?: string | null;
          approved_by?: string | null;
          basis: Database["public"]["Enums"]["eligible_volume_basis"];
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          organization_id: string;
          policy_configuration_id: string;
          status?: string;
        };
        Update: {
          accrual_id?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          basis?: Database["public"]["Enums"]["eligible_volume_basis"];
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          organization_id?: string;
          policy_configuration_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eligible_volume_policies_accrual_id_fkey";
            columns: ["accrual_id"];
            isOneToOne: false;
            referencedRelation: "accruals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eligible_volume_policies_organization_id_accrual_id_fkey";
            columns: ["organization_id", "accrual_id"];
            isOneToOne: false;
            referencedRelation: "accruals";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "eligible_volume_policies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eligible_volume_policies_organization_id_policy_configurat_fkey";
            columns: ["organization_id", "policy_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "eligible_volume_policies_policy_configuration_id_fkey";
            columns: ["policy_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      erp_transactions: {
        Row: {
          approved_at: string;
          approved_by: string | null;
          id: string;
          ingestion_posting_id: string;
          mapping_configuration_id: string;
          oem_id: string | null;
          organization_id: string;
          original_currency: string | null;
          original_source_field: string | null;
          original_value: number | null;
          part_id: string | null;
          plant_id: string | null;
          program_id: string | null;
          raw_record_id: string;
          recovery_classification: string | null;
          recovery_eligible: boolean | null;
          signed_quantity: number | null;
          source_system: string;
          source_timestamp: string;
          source_transaction_id: string;
          supplier_id: string | null;
          transaction_date: string;
          transaction_type: Database["public"]["Enums"]["erp_transaction_type"];
          vehicle_model_id: string | null;
        };
        Insert: {
          approved_at: string;
          approved_by?: string | null;
          id?: string;
          ingestion_posting_id: string;
          mapping_configuration_id: string;
          oem_id?: string | null;
          organization_id: string;
          original_currency?: string | null;
          original_source_field?: string | null;
          original_value?: number | null;
          part_id?: string | null;
          plant_id?: string | null;
          program_id?: string | null;
          raw_record_id: string;
          recovery_classification?: string | null;
          recovery_eligible?: boolean | null;
          signed_quantity?: number | null;
          source_system: string;
          source_timestamp: string;
          source_transaction_id: string;
          supplier_id?: string | null;
          transaction_date: string;
          transaction_type: Database["public"]["Enums"]["erp_transaction_type"];
          vehicle_model_id?: string | null;
        };
        Update: {
          approved_at?: string;
          approved_by?: string | null;
          id?: string;
          ingestion_posting_id?: string;
          mapping_configuration_id?: string;
          oem_id?: string | null;
          organization_id?: string;
          original_currency?: string | null;
          original_source_field?: string | null;
          original_value?: number | null;
          part_id?: string | null;
          plant_id?: string | null;
          program_id?: string | null;
          raw_record_id?: string;
          recovery_classification?: string | null;
          recovery_eligible?: boolean | null;
          signed_quantity?: number | null;
          source_system?: string;
          source_timestamp?: string;
          source_transaction_id?: string;
          supplier_id?: string | null;
          transaction_date?: string;
          transaction_type?: Database["public"]["Enums"]["erp_transaction_type"];
          vehicle_model_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "erp_transactions_ingestion_posting_id_fkey";
            columns: ["ingestion_posting_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_postings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_mapping_configuration_id_fkey";
            columns: ["mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_ingestion_posting_id_fkey";
            columns: ["organization_id", "ingestion_posting_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_postings";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_mapping_configuration_id_fkey";
            columns: ["organization_id", "mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_oem_id_fkey";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_plant_id_fkey";
            columns: ["organization_id", "plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_raw_record_id_fkey";
            columns: ["organization_id", "raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_ingestion_records";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_supplier_id_fkey";
            columns: ["organization_id", "supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_organization_id_vehicle_model_id_fkey";
            columns: ["organization_id", "vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "erp_transactions_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_plant_id_fkey";
            columns: ["plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_raw_record_id_fkey";
            columns: ["raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_ingestion_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "erp_transactions_vehicle_model_id_fkey";
            columns: ["vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_field_candidates: {
        Row: {
          approved_value: Json | null;
          confidence: number | null;
          correction_reason: string | null;
          created_at: string;
          evidence_page: number | null;
          evidence_table_coordinates: Json | null;
          evidence_text: string | null;
          extraction_job_id: string;
          field_key: string;
          id: string;
          normalized_value: Json | null;
          organization_id: string;
          raw_value: string | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          status: string;
          warnings: Json;
        };
        Insert: {
          approved_value?: Json | null;
          confidence?: number | null;
          correction_reason?: string | null;
          created_at?: string;
          evidence_page?: number | null;
          evidence_table_coordinates?: Json | null;
          evidence_text?: string | null;
          extraction_job_id: string;
          field_key: string;
          id?: string;
          normalized_value?: Json | null;
          organization_id: string;
          raw_value?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          status?: string;
          warnings?: Json;
        };
        Update: {
          approved_value?: Json | null;
          confidence?: number | null;
          correction_reason?: string | null;
          created_at?: string;
          evidence_page?: number | null;
          evidence_table_coordinates?: Json | null;
          evidence_text?: string | null;
          extraction_job_id?: string;
          field_key?: string;
          id?: string;
          normalized_value?: Json | null;
          organization_id?: string;
          raw_value?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          status?: string;
          warnings?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "extraction_field_candidates_extraction_job_id_fkey";
            columns: ["extraction_job_id"];
            isOneToOne: false;
            referencedRelation: "extraction_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extraction_field_candidates_organization_id_extraction_job_fkey";
            columns: ["organization_id", "extraction_job_id"];
            isOneToOne: false;
            referencedRelation: "extraction_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "extraction_field_candidates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_jobs: {
        Row: {
          attempts: number;
          completed_at: string | null;
          created_at: string;
          document_version_id: string;
          error_code: string | null;
          error_detail: string | null;
          id: string;
          mapping_configuration_id: string;
          organization_id: string;
          provider: string;
          provider_version: string;
          result: Json | null;
          status: Database["public"]["Enums"]["job_status"];
        };
        Insert: {
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
          document_version_id: string;
          error_code?: string | null;
          error_detail?: string | null;
          id?: string;
          mapping_configuration_id: string;
          organization_id: string;
          provider: string;
          provider_version: string;
          result?: Json | null;
          status?: Database["public"]["Enums"]["job_status"];
        };
        Update: {
          attempts?: number;
          completed_at?: string | null;
          created_at?: string;
          document_version_id?: string;
          error_code?: string | null;
          error_detail?: string | null;
          id?: string;
          mapping_configuration_id?: string;
          organization_id?: string;
          provider?: string;
          provider_version?: string;
          result?: Json | null;
          status?: Database["public"]["Enums"]["job_status"];
        };
        Relationships: [
          {
            foreignKeyName: "extraction_jobs_document_version_id_fkey";
            columns: ["document_version_id"];
            isOneToOne: false;
            referencedRelation: "document_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extraction_jobs_mapping_configuration_id_fkey";
            columns: ["mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extraction_jobs_organization_id_document_version_id_fkey";
            columns: ["organization_id", "document_version_id"];
            isOneToOne: false;
            referencedRelation: "document_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "extraction_jobs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extraction_jobs_organization_id_mapping_configuration_id_fkey";
            columns: ["organization_id", "mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      extraction_reviews: {
        Row: {
          approved_fields: Json;
          corrections: Json;
          extraction_job_id: string;
          id: string;
          organization_id: string;
          reviewed_at: string;
          reviewer_id: string | null;
        };
        Insert: {
          approved_fields: Json;
          corrections?: Json;
          extraction_job_id: string;
          id?: string;
          organization_id: string;
          reviewed_at?: string;
          reviewer_id?: string | null;
        };
        Update: {
          approved_fields?: Json;
          corrections?: Json;
          extraction_job_id?: string;
          id?: string;
          organization_id?: string;
          reviewed_at?: string;
          reviewer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "extraction_reviews_extraction_job_id_fkey";
            columns: ["extraction_job_id"];
            isOneToOne: true;
            referencedRelation: "extraction_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extraction_reviews_organization_id_extraction_job_id_fkey";
            columns: ["organization_id", "extraction_job_id"];
            isOneToOne: false;
            referencedRelation: "extraction_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "extraction_reviews_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      forecast_lines: {
        Row: {
          forecast_version_id: string;
          id: string;
          organization_id: string;
          part_id: string;
          period: unknown;
          program_id: string;
          source_reference: string | null;
          units: number;
        };
        Insert: {
          forecast_version_id: string;
          id?: string;
          organization_id: string;
          part_id: string;
          period: unknown;
          program_id: string;
          source_reference?: string | null;
          units: number;
        };
        Update: {
          forecast_version_id?: string;
          id?: string;
          organization_id?: string;
          part_id?: string;
          period?: unknown;
          program_id?: string;
          source_reference?: string | null;
          units?: number;
        };
        Relationships: [
          {
            foreignKeyName: "forecast_lines_forecast_version_id_fkey";
            columns: ["forecast_version_id"];
            isOneToOne: false;
            referencedRelation: "forecast_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forecast_lines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forecast_lines_organization_id_forecast_version_id_fkey";
            columns: ["organization_id", "forecast_version_id"];
            isOneToOne: false;
            referencedRelation: "forecast_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "forecast_lines_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "forecast_lines_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "forecast_lines_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forecast_lines_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ];
      };
      forecast_versions: {
        Row: {
          as_of_date: string;
          created_at: string;
          created_by: string | null;
          id: string;
          organization_id: string;
          provenance: Json;
          source: string;
          status: string;
          version: number;
        };
        Insert: {
          as_of_date: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id: string;
          provenance?: Json;
          source: string;
          status: string;
          version: number;
        };
        Update: {
          as_of_date?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id?: string;
          provenance?: Json;
          source?: string;
          status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "forecast_versions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      import_runs: {
        Row: {
          committed_row_count: number;
          completed_at: string | null;
          connector_id: string;
          content_sha256: string;
          created_at: string;
          file_name: string | null;
          id: string;
          initiated_by: string | null;
          organization_id: string;
          row_count: number;
          status: Database["public"]["Enums"]["import_status"];
          valid_row_count: number;
        };
        Insert: {
          committed_row_count?: number;
          completed_at?: string | null;
          connector_id: string;
          content_sha256: string;
          created_at?: string;
          file_name?: string | null;
          id?: string;
          initiated_by?: string | null;
          organization_id: string;
          row_count?: number;
          status?: Database["public"]["Enums"]["import_status"];
          valid_row_count?: number;
        };
        Update: {
          committed_row_count?: number;
          completed_at?: string | null;
          connector_id?: string;
          content_sha256?: string;
          created_at?: string;
          file_name?: string | null;
          id?: string;
          initiated_by?: string | null;
          organization_id?: string;
          row_count?: number;
          status?: Database["public"]["Enums"]["import_status"];
          valid_row_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "import_runs_connector_id_fkey";
            columns: ["connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_runs_organization_id_connector_id_fkey";
            columns: ["organization_id", "connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "import_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      import_staging_rows: {
        Row: {
          errors: Json;
          id: number;
          import_run_id: string;
          normalized_data: Json | null;
          organization_id: string;
          row_number: number;
          source_data: Json;
          valid: boolean;
        };
        Insert: {
          errors?: Json;
          id?: never;
          import_run_id: string;
          normalized_data?: Json | null;
          organization_id: string;
          row_number: number;
          source_data: Json;
          valid?: boolean;
        };
        Update: {
          errors?: Json;
          id?: never;
          import_run_id?: string;
          normalized_data?: Json | null;
          organization_id?: string;
          row_number?: number;
          source_data?: Json;
          valid?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "import_staging_rows_import_run_id_fkey";
            columns: ["import_run_id"];
            isOneToOne: false;
            referencedRelation: "import_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_staging_rows_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_staging_rows_organization_id_import_run_id_fkey";
            columns: ["organization_id", "import_run_id"];
            isOneToOne: false;
            referencedRelation: "import_runs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      ingestion_batches: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          approved_count: number;
          connector_id: string | null;
          content_sha256: string;
          created_at: string;
          domain: Database["public"]["Enums"]["ingestion_domain"];
          id: string;
          initiated_by: string | null;
          mapped_count: number;
          mapping_configuration_id: string | null;
          organization_id: string;
          posted_at: string | null;
          posted_count: number;
          provider_key: string;
          received_at: string;
          received_count: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source_metadata: Json;
          source_object_name: string | null;
          source_object_path: string;
          status: Database["public"]["Enums"]["ingestion_lifecycle_status"];
          status_reason: string | null;
          transport: Database["public"]["Enums"]["ingestion_transport"];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          approved_count?: number;
          connector_id?: string | null;
          content_sha256: string;
          created_at?: string;
          domain: Database["public"]["Enums"]["ingestion_domain"];
          id?: string;
          initiated_by?: string | null;
          mapped_count?: number;
          mapping_configuration_id?: string | null;
          organization_id: string;
          posted_at?: string | null;
          posted_count?: number;
          provider_key: string;
          received_at?: string;
          received_count?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_metadata?: Json;
          source_object_name?: string | null;
          source_object_path: string;
          status?: Database["public"]["Enums"]["ingestion_lifecycle_status"];
          status_reason?: string | null;
          transport: Database["public"]["Enums"]["ingestion_transport"];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          approved_count?: number;
          connector_id?: string | null;
          content_sha256?: string;
          created_at?: string;
          domain?: Database["public"]["Enums"]["ingestion_domain"];
          id?: string;
          initiated_by?: string | null;
          mapped_count?: number;
          mapping_configuration_id?: string | null;
          organization_id?: string;
          posted_at?: string | null;
          posted_count?: number;
          provider_key?: string;
          received_at?: string;
          received_count?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_metadata?: Json;
          source_object_name?: string | null;
          source_object_path?: string;
          status?: Database["public"]["Enums"]["ingestion_lifecycle_status"];
          status_reason?: string | null;
          transport?: Database["public"]["Enums"]["ingestion_transport"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingestion_batches_connector_id_fkey";
            columns: ["connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_batches_mapping_configuration_id_fkey";
            columns: ["mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_batches_organization_id_connector_id_fkey";
            columns: ["organization_id", "connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_batches_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_batches_organization_id_mapping_configuration_id_fkey";
            columns: ["organization_id", "mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      ingestion_candidates: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          candidate_key: string;
          canonical_record: Json;
          created_at: string;
          domain: Database["public"]["Enums"]["ingestion_domain"];
          economic_event_key: string | null;
          id: string;
          ingestion_batch_id: string;
          mapping_configuration_id: string;
          oem_id: string | null;
          organization_id: string;
          part_id: string | null;
          plant_id: string | null;
          program_id: string | null;
          raw_record_id: string;
          region_id: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["ingestion_lifecycle_status"];
          updated_at: string;
          validation_errors: Json;
          validation_warnings: Json;
          vehicle_model_id: string | null;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          candidate_key: string;
          canonical_record: Json;
          created_at?: string;
          domain: Database["public"]["Enums"]["ingestion_domain"];
          economic_event_key?: string | null;
          id?: string;
          ingestion_batch_id: string;
          mapping_configuration_id: string;
          oem_id?: string | null;
          organization_id: string;
          part_id?: string | null;
          plant_id?: string | null;
          program_id?: string | null;
          raw_record_id: string;
          region_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["ingestion_lifecycle_status"];
          updated_at?: string;
          validation_errors?: Json;
          validation_warnings?: Json;
          vehicle_model_id?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          candidate_key?: string;
          canonical_record?: Json;
          created_at?: string;
          domain?: Database["public"]["Enums"]["ingestion_domain"];
          economic_event_key?: string | null;
          id?: string;
          ingestion_batch_id?: string;
          mapping_configuration_id?: string;
          oem_id?: string | null;
          organization_id?: string;
          part_id?: string | null;
          plant_id?: string | null;
          program_id?: string | null;
          raw_record_id?: string;
          region_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["ingestion_lifecycle_status"];
          updated_at?: string;
          validation_errors?: Json;
          validation_warnings?: Json;
          vehicle_model_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ingestion_candidates_ingestion_batch_id_fkey";
            columns: ["ingestion_batch_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_mapping_configuration_id_fkey";
            columns: ["mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_ingestion_batch_id_fkey";
            columns: ["organization_id", "ingestion_batch_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_batches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_mapping_configuration_fkey";
            columns: ["organization_id", "mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_oem_id_fkey";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_plant_id_fkey";
            columns: ["organization_id", "plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_raw_record_id_fkey";
            columns: ["organization_id", "raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_ingestion_records";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_region_id_fkey";
            columns: ["organization_id", "region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_organization_id_vehicle_model_id_fkey";
            columns: ["organization_id", "vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_candidates_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_plant_id_fkey";
            columns: ["plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_raw_record_id_fkey";
            columns: ["raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_ingestion_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_candidates_vehicle_model_id_fkey";
            columns: ["vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      ingestion_exceptions: {
        Row: {
          created_at: string;
          details: Json;
          economic_event_key: string | null;
          exception_type: Database["public"]["Enums"]["ingestion_exception_type"];
          id: string;
          ingestion_batch_id: string;
          organization_id: string;
          raw_record_ids: string[];
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          details?: Json;
          economic_event_key?: string | null;
          exception_type: Database["public"]["Enums"]["ingestion_exception_type"];
          id?: string;
          ingestion_batch_id: string;
          organization_id: string;
          raw_record_ids?: string[];
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          details?: Json;
          economic_event_key?: string | null;
          exception_type?: Database["public"]["Enums"]["ingestion_exception_type"];
          id?: string;
          ingestion_batch_id?: string;
          organization_id?: string;
          raw_record_ids?: string[];
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingestion_exceptions_ingestion_batch_id_fkey";
            columns: ["ingestion_batch_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_exceptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_exceptions_organization_id_ingestion_batch_id_fkey";
            columns: ["organization_id", "ingestion_batch_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_batches";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      ingestion_postings: {
        Row: {
          candidate_id: string;
          destination_id: string;
          destination_type: string;
          economic_event_key: string;
          id: string;
          organization_id: string;
          posted_at: string;
          posted_by: string | null;
        };
        Insert: {
          candidate_id: string;
          destination_id: string;
          destination_type: string;
          economic_event_key: string;
          id?: string;
          organization_id: string;
          posted_at?: string;
          posted_by?: string | null;
        };
        Update: {
          candidate_id?: string;
          destination_id?: string;
          destination_type?: string;
          economic_event_key?: string;
          id?: string;
          organization_id?: string;
          posted_at?: string;
          posted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ingestion_postings_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: true;
            referencedRelation: "ingestion_candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingestion_postings_organization_id_candidate_id_fkey";
            columns: ["organization_id", "candidate_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_candidates";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "ingestion_postings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      master_data_aliases: {
        Row: {
          alias: string;
          approved_at: string;
          approved_by: string;
          created_at: string;
          effective_from: string | null;
          effective_to: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          organization_id: string;
          provenance: Json;
          provider_identifier: string | null;
          provider_key: string | null;
        };
        Insert: {
          alias: string;
          approved_at: string;
          approved_by: string;
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          organization_id: string;
          provenance?: Json;
          provider_identifier?: string | null;
          provider_key?: string | null;
        };
        Update: {
          alias?: string;
          approved_at?: string;
          approved_by?: string;
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          organization_id?: string;
          provenance?: Json;
          provider_identifier?: string | null;
          provider_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "master_data_aliases_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      master_data_merge_events: {
        Row: {
          approved_by: string;
          canonical_entity_id: string;
          entity_type: string;
          id: string;
          occurred_at: string;
          organization_id: string;
          provenance: Json;
          reason: string;
          source_entity_id: string;
        };
        Insert: {
          approved_by: string;
          canonical_entity_id: string;
          entity_type: string;
          id?: string;
          occurred_at?: string;
          organization_id: string;
          provenance?: Json;
          reason: string;
          source_entity_id: string;
        };
        Update: {
          approved_by?: string;
          canonical_entity_id?: string;
          entity_type?: string;
          id?: string;
          occurred_at?: string;
          organization_id?: string;
          provenance?: Json;
          reason?: string;
          source_entity_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "master_data_merge_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      master_data_proposals: {
        Row: {
          created_at: string;
          duplicate_candidate_ids: string[];
          entity_type: string;
          exception_reason: string;
          id: string;
          organization_id: string;
          proposed_by: string | null;
          proposed_payload: Json;
          provenance: Json;
          resulting_entity_id: string | null;
          review_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          duplicate_candidate_ids?: string[];
          entity_type: string;
          exception_reason: string;
          id?: string;
          organization_id: string;
          proposed_by?: string | null;
          proposed_payload: Json;
          provenance?: Json;
          resulting_entity_id?: string | null;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          duplicate_candidate_ids?: string[];
          entity_type?: string;
          exception_reason?: string;
          id?: string;
          organization_id?: string;
          proposed_by?: string | null;
          proposed_payload?: Json;
          provenance?: Json;
          resulting_entity_id?: string | null;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "master_data_proposals_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      materiality_rules: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          created_by: string | null;
          currency: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          metric: string;
          organization_id: string;
          rationale: string;
          scope_id: string | null;
          scope_type: string;
          status: Database["public"]["Enums"]["configuration_status"];
          supersedes_id: string | null;
          threshold_amount: number | null;
          threshold_days: number | null;
          threshold_percentage: number | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          metric: string;
          organization_id: string;
          rationale: string;
          scope_id?: string | null;
          scope_type?: string;
          status?: Database["public"]["Enums"]["configuration_status"];
          supersedes_id?: string | null;
          threshold_amount?: number | null;
          threshold_days?: number | null;
          threshold_percentage?: number | null;
          updated_at?: string;
          version: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          metric?: string;
          organization_id?: string;
          rationale?: string;
          scope_id?: string | null;
          scope_type?: string;
          status?: Database["public"]["Enums"]["configuration_status"];
          supersedes_id?: string | null;
          threshold_amount?: number | null;
          threshold_days?: number | null;
          threshold_percentage?: number | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "materiality_rules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materiality_rules_organization_id_supersedes_id_fkey";
            columns: ["organization_id", "supersedes_id"];
            isOneToOne: false;
            referencedRelation: "materiality_rules";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "materiality_rules_supersedes_id_fkey";
            columns: ["supersedes_id"];
            isOneToOne: false;
            referencedRelation: "materiality_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["organization_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["organization_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["organization_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_outbox: {
        Row: {
          attempts: number;
          available_at: string;
          created_at: string;
          delivered_at: string | null;
          event_type: string;
          id: string;
          last_error: string | null;
          organization_id: string;
          payload: Json;
          recipient_user_id: string | null;
          status: string;
        };
        Insert: {
          attempts?: number;
          available_at?: string;
          created_at?: string;
          delivered_at?: string | null;
          event_type: string;
          id?: string;
          last_error?: string | null;
          organization_id: string;
          payload: Json;
          recipient_user_id?: string | null;
          status?: string;
        };
        Update: {
          attempts?: number;
          available_at?: string;
          created_at?: string;
          delivered_at?: string | null;
          event_type?: string;
          id?: string;
          last_error?: string | null;
          organization_id?: string;
          payload?: Json;
          recipient_user_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_outbox_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      oems: {
        Row: {
          created_at: string;
          external_code: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          external_code?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          external_code?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oems_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          organization_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          role: Database["public"]["Enums"]["organization_role"];
          status: Database["public"]["Enums"]["invitation_status"];
          target_user_id: string | null;
          token_digest: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          organization_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: Database["public"]["Enums"]["organization_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          target_user_id?: string | null;
          token_digest: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          organization_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: Database["public"]["Enums"]["organization_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
          target_user_id?: string | null;
          token_digest?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_subscriptions: {
        Row: {
          created_at: string;
          created_by: string | null;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          organization_id: string;
          plan_id: string;
          provider_customer_ref: string | null;
          provider_key: string | null;
          provider_subscription_ref: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          organization_id: string;
          plan_id: string;
          provider_customer_ref?: string | null;
          provider_key?: string | null;
          provider_subscription_ref?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          organization_id?: string;
          plan_id?: string;
          provider_customer_ref?: string | null;
          provider_key?: string | null;
          provider_subscription_ref?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plan_catalog";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          default_currency: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_currency?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_currency?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      part_commodities: {
        Row: {
          commodity_id: string;
          created_at: string;
          id: string;
          organization_id: string;
          part_id: string;
        };
        Insert: {
          commodity_id: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          part_id: string;
        };
        Update: {
          commodity_id?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          part_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "part_commodities_commodity_id_fkey";
            columns: ["commodity_id"];
            isOneToOne: false;
            referencedRelation: "commodities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_commodities_organization_id_commodity_id_fkey";
            columns: ["organization_id", "commodity_id"];
            isOneToOne: false;
            referencedRelation: "commodities";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_commodities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_commodities_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_commodities_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
        ];
      };
      part_program_applications: {
        Row: {
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          organization_id: string;
          part_id: string;
          part_revision_id: string | null;
          program_id: string;
          program_model_year_id: string | null;
        };
        Insert: {
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          organization_id: string;
          part_id: string;
          part_revision_id?: string | null;
          program_id: string;
          program_model_year_id?: string | null;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          organization_id?: string;
          part_id?: string;
          part_revision_id?: string | null;
          program_id?: string;
          program_model_year_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "part_program_applications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_program_applications_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_program_applications_organization_id_part_revision_id_fkey";
            columns: ["organization_id", "part_revision_id"];
            isOneToOne: false;
            referencedRelation: "part_revisions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_program_applications_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_program_applications_organization_id_program_model_ye_fkey";
            columns: ["organization_id", "program_model_year_id"];
            isOneToOne: false;
            referencedRelation: "program_model_years";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_program_applications_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_program_applications_part_revision_id_fkey";
            columns: ["part_revision_id"];
            isOneToOne: false;
            referencedRelation: "part_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_program_applications_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_program_applications_program_model_year_id_fkey";
            columns: ["program_model_year_id"];
            isOneToOne: false;
            referencedRelation: "program_model_years";
            referencedColumns: ["id"];
          },
        ];
      };
      part_revisions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          description: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          organization_id: string;
          part_id: string;
          revision_code: string;
          source_dcr_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          description?: string | null;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          organization_id: string;
          part_id: string;
          revision_code: string;
          source_dcr_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          description?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          organization_id?: string;
          part_id?: string;
          revision_code?: string;
          source_dcr_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "part_revisions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_revisions_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_revisions_organization_id_source_dcr_id_fkey";
            columns: ["organization_id", "source_dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_revisions_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_revisions_source_dcr_id_fkey";
            columns: ["source_dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["id"];
          },
        ];
      };
      part_vehicle_rules: {
        Row: {
          allocation: number;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          mapping_configuration_id: string;
          organization_id: string;
          part_id: string;
          parts_per_vehicle: number;
          plant_id: string | null;
          program_id: string;
          status: string;
          take_rate: number;
          vehicle_model_id: string;
        };
        Insert: {
          allocation?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          mapping_configuration_id: string;
          organization_id: string;
          part_id: string;
          parts_per_vehicle: number;
          plant_id?: string | null;
          program_id: string;
          status?: string;
          take_rate?: number;
          vehicle_model_id: string;
        };
        Update: {
          allocation?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          mapping_configuration_id?: string;
          organization_id?: string;
          part_id?: string;
          parts_per_vehicle?: number;
          plant_id?: string | null;
          program_id?: string;
          status?: string;
          take_rate?: number;
          vehicle_model_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "part_vehicle_rules_mapping_configuration_id_fkey";
            columns: ["mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_organization_id_mapping_configuration_i_fkey";
            columns: ["organization_id", "mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_organization_id_plant_id_fkey";
            columns: ["organization_id", "plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_organization_id_vehicle_model_id_fkey";
            columns: ["organization_id", "vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_plant_id_fkey";
            columns: ["plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_vehicle_rules_vehicle_model_id_fkey";
            columns: ["vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      parts: {
        Row: {
          created_at: string;
          department_id: string | null;
          description: string | null;
          id: string;
          organization_id: string;
          part_number: string;
          program_id: string | null;
          status: string;
          technical_team_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          department_id?: string | null;
          description?: string | null;
          id?: string;
          organization_id: string;
          part_number: string;
          program_id?: string | null;
          status?: string;
          technical_team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          department_id?: string | null;
          description?: string | null;
          id?: string;
          organization_id?: string;
          part_number?: string;
          program_id?: string | null;
          status?: string;
          technical_team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parts_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_department_same_tenant";
            columns: ["organization_id", "department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "parts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parts_program_same_tenant";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "parts_team_same_tenant";
            columns: ["organization_id", "technical_team_id"];
            isOneToOne: false;
            referencedRelation: "technical_teams";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "parts_technical_team_id_fkey";
            columns: ["technical_team_id"];
            isOneToOne: false;
            referencedRelation: "technical_teams";
            referencedColumns: ["id"];
          },
        ];
      };
      permission_grants: {
        Row: {
          created_at: string;
          created_by: string | null;
          grant_type: Database["public"]["Enums"]["grant_type"];
          id: string;
          organization_id: string;
          permissions: Database["public"]["Enums"]["permission_name"][];
          resource_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          grant_type: Database["public"]["Enums"]["grant_type"];
          id?: string;
          organization_id: string;
          permissions?: Database["public"]["Enums"]["permission_name"][];
          resource_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          grant_type?: Database["public"]["Enums"]["grant_type"];
          id?: string;
          organization_id?: string;
          permissions?: Database["public"]["Enums"]["permission_name"][];
          resource_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "permission_grants_member_same_tenant";
            columns: ["organization_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "permission_grants_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_catalog: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          features: Json;
          id: string;
          name: string;
          seat_limit: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          features?: Json;
          id?: string;
          name: string;
          seat_limit: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          features?: Json;
          id?: string;
          name?: string;
          seat_limit?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      plants: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          oem_id: string | null;
          organization_id: string;
          region_id: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          oem_id?: string | null;
          organization_id: string;
          region_id: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          oem_id?: string | null;
          organization_id?: string;
          region_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plants_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plants_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plants_organization_id_oem_id_fkey";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "plants_organization_id_region_id_fkey";
            columns: ["organization_id", "region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "plants_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      program_model_years: {
        Row: {
          created_at: string;
          end_date: string | null;
          id: string;
          model_year: number;
          organization_id: string;
          program_id: string;
          provider_identifier: string | null;
          provider_key: string | null;
          start_date: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date?: string | null;
          id?: string;
          model_year: number;
          organization_id: string;
          program_id: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          start_date?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string | null;
          id?: string;
          model_year?: number;
          organization_id?: string;
          program_id?: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          start_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_model_years_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_model_years_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "program_model_years_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ];
      };
      programs: {
        Row: {
          code: string;
          created_at: string;
          creation_path: string;
          department_id: string | null;
          end_date: string | null;
          exception_proposal_id: string | null;
          id: string;
          name: string;
          oem_id: string | null;
          organization_id: string;
          provider_identifier: string | null;
          provider_key: string | null;
          start_date: string | null;
          technical_team_id: string | null;
          updated_at: string;
          vehicle_architecture_id: string | null;
          vehicle_model_id: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          creation_path?: string;
          department_id?: string | null;
          end_date?: string | null;
          exception_proposal_id?: string | null;
          id?: string;
          name: string;
          oem_id?: string | null;
          organization_id: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          start_date?: string | null;
          technical_team_id?: string | null;
          updated_at?: string;
          vehicle_architecture_id?: string | null;
          vehicle_model_id?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          creation_path?: string;
          department_id?: string | null;
          end_date?: string | null;
          exception_proposal_id?: string | null;
          id?: string;
          name?: string;
          oem_id?: string | null;
          organization_id?: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          start_date?: string | null;
          technical_team_id?: string | null;
          updated_at?: string;
          vehicle_architecture_id?: string | null;
          vehicle_model_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_department_same_tenant";
            columns: ["organization_id", "department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "programs_exception_proposal_id_fkey";
            columns: ["exception_proposal_id"];
            isOneToOne: false;
            referencedRelation: "master_data_proposals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_exception_proposal_same_tenant";
            columns: ["organization_id", "exception_proposal_id"];
            isOneToOne: false;
            referencedRelation: "master_data_proposals";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "programs_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_oem_same_tenant";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "programs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_team_same_tenant";
            columns: ["organization_id", "technical_team_id"];
            isOneToOne: false;
            referencedRelation: "technical_teams";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "programs_technical_team_id_fkey";
            columns: ["technical_team_id"];
            isOneToOne: false;
            referencedRelation: "technical_teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_vehicle_architecture_id_fkey";
            columns: ["vehicle_architecture_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_architectures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_vehicle_architecture_same_tenant";
            columns: ["organization_id", "vehicle_architecture_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_architectures";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "programs_vehicle_model_id_fkey";
            columns: ["vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_vehicle_model_same_tenant";
            columns: ["organization_id", "vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      raw_ingestion_records: {
        Row: {
          economic_event_key: string | null;
          id: string;
          ingestion_batch_id: string;
          organization_id: string;
          raw_payload: Json;
          received_at: string;
          record_index: number;
          source_record_id: string;
          source_record_sha256: string;
          source_timestamp: string | null;
          supersedes_raw_record_id: string | null;
        };
        Insert: {
          economic_event_key?: string | null;
          id?: string;
          ingestion_batch_id: string;
          organization_id: string;
          raw_payload: Json;
          received_at?: string;
          record_index: number;
          source_record_id: string;
          source_record_sha256: string;
          source_timestamp?: string | null;
          supersedes_raw_record_id?: string | null;
        };
        Update: {
          economic_event_key?: string | null;
          id?: string;
          ingestion_batch_id?: string;
          organization_id?: string;
          raw_payload?: Json;
          received_at?: string;
          record_index?: number;
          source_record_id?: string;
          source_record_sha256?: string;
          source_timestamp?: string | null;
          supersedes_raw_record_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "raw_ingestion_records_ingestion_batch_id_fkey";
            columns: ["ingestion_batch_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "raw_ingestion_records_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "raw_ingestion_records_organization_id_ingestion_batch_id_fkey";
            columns: ["organization_id", "ingestion_batch_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_batches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "raw_ingestion_records_organization_id_supersedes_raw_recor_fkey";
            columns: ["organization_id", "supersedes_raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_ingestion_records";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "raw_ingestion_records_supersedes_raw_record_id_fkey";
            columns: ["supersedes_raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_ingestion_records";
            referencedColumns: ["id"];
          },
        ];
      };
      reconciliation_runs: {
        Row: {
          candidate_count: number;
          created_at: string;
          duplicate_count: number;
          exception_count: number;
          id: string;
          ingestion_batch_id: string;
          organization_id: string;
          posted_count: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source_record_count: number;
          status: string;
          summary: Json;
        };
        Insert: {
          candidate_count: number;
          created_at?: string;
          duplicate_count: number;
          exception_count: number;
          id?: string;
          ingestion_batch_id: string;
          organization_id: string;
          posted_count: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_record_count: number;
          status?: string;
          summary?: Json;
        };
        Update: {
          candidate_count?: number;
          created_at?: string;
          duplicate_count?: number;
          exception_count?: number;
          id?: string;
          ingestion_batch_id?: string;
          organization_id?: string;
          posted_count?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_record_count?: number;
          status?: string;
          summary?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "reconciliation_runs_ingestion_batch_id_fkey";
            columns: ["ingestion_batch_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_runs_organization_id_ingestion_batch_id_fkey";
            columns: ["organization_id", "ingestion_batch_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_batches";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      recovery_agreement_dcrs: {
        Row: {
          created_at: string;
          dcr_id: string;
          id: string;
          organization_id: string;
          recovery_agreement_id: string;
        };
        Insert: {
          created_at?: string;
          dcr_id: string;
          id?: string;
          organization_id: string;
          recovery_agreement_id: string;
        };
        Update: {
          created_at?: string;
          dcr_id?: string;
          id?: string;
          organization_id?: string;
          recovery_agreement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_agreement_dcrs_dcr_id_fkey";
            columns: ["dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_dcrs_organization_id_dcr_id_fkey";
            columns: ["organization_id", "dcr_id"];
            isOneToOne: false;
            referencedRelation: "dcrs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_dcrs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_dcrs_organization_id_recovery_agreement_fkey";
            columns: ["organization_id", "recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_dcrs_recovery_agreement_id_fkey";
            columns: ["recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["id"];
          },
        ];
      };
      recovery_agreement_model_years: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          program_model_year_id: string;
          recovery_agreement_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          program_model_year_id: string;
          recovery_agreement_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          program_model_year_id?: string;
          recovery_agreement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_agreement_model_year_organization_id_program_mode_fkey";
            columns: ["organization_id", "program_model_year_id"];
            isOneToOne: false;
            referencedRelation: "program_model_years";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_model_year_organization_id_recovery_agr_fkey";
            columns: ["organization_id", "recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_model_years_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_model_years_program_model_year_id_fkey";
            columns: ["program_model_year_id"];
            isOneToOne: false;
            referencedRelation: "program_model_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_model_years_recovery_agreement_id_fkey";
            columns: ["recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["id"];
          },
        ];
      };
      recovery_agreement_parts: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          part_id: string;
          part_revision_id: string | null;
          recovery_agreement_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          part_id: string;
          part_revision_id?: string | null;
          recovery_agreement_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          part_id?: string;
          part_revision_id?: string | null;
          recovery_agreement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_agreement_parts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_parts_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_parts_organization_id_part_revision_id_fkey";
            columns: ["organization_id", "part_revision_id"];
            isOneToOne: false;
            referencedRelation: "part_revisions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_parts_organization_id_recovery_agreemen_fkey";
            columns: ["organization_id", "recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_parts_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_parts_part_revision_id_fkey";
            columns: ["part_revision_id"];
            isOneToOne: false;
            referencedRelation: "part_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_parts_recovery_agreement_id_fkey";
            columns: ["recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["id"];
          },
        ];
      };
      recovery_agreement_programs: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          program_id: string;
          recovery_agreement_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          program_id: string;
          recovery_agreement_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          program_id?: string;
          recovery_agreement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_agreement_programs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_programs_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_programs_organization_id_recovery_agree_fkey";
            columns: ["organization_id", "recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_programs_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_programs_recovery_agreement_id_fkey";
            columns: ["recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["id"];
          },
        ];
      };
      recovery_agreement_rate_periods: {
        Row: {
          created_at: string;
          currency: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          organization_id: string;
          per_unit_rate: number;
          recovery_agreement_id: string;
        };
        Insert: {
          created_at?: string;
          currency: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          organization_id: string;
          per_unit_rate: number;
          recovery_agreement_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          organization_id?: string;
          per_unit_rate?: number;
          recovery_agreement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_agreement_rate_perio_organization_id_recovery_agr_fkey";
            columns: ["organization_id", "recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreement_rate_periods_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreement_rate_periods_recovery_agreement_id_fkey";
            columns: ["recovery_agreement_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["id"];
          },
        ];
      };
      recovery_agreements: {
        Row: {
          agreement_number: string;
          approved_at: string | null;
          approved_by: string | null;
          contractual_limit_amount: number | null;
          created_at: string;
          effective_from: string | null;
          effective_to: string | null;
          eligible_volume_basis: Database["public"]["Enums"]["eligible_volume_basis"];
          evidence_document_version_id: string | null;
          evidence_reference: string | null;
          evidence_review_method: string | null;
          evidence_reviewed_at: string | null;
          evidence_reviewed_by: string | null;
          evidence_summary: string | null;
          expires_on: string | null;
          forecast_assumptions: Json;
          forecast_assumptions_version: string | null;
          id: string;
          organization_id: string;
          owner_user_id: string | null;
          recoverable_cost: number;
          rounding_mode: string;
          rounding_scale: number;
          settlement_currency: string;
          status: Database["public"]["Enums"]["recovery_agreement_status"];
          supersedes_id: string | null;
          supplier_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          agreement_number: string;
          approved_at?: string | null;
          approved_by?: string | null;
          contractual_limit_amount?: number | null;
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          eligible_volume_basis: Database["public"]["Enums"]["eligible_volume_basis"];
          evidence_document_version_id?: string | null;
          evidence_reference?: string | null;
          evidence_review_method?: string | null;
          evidence_reviewed_at?: string | null;
          evidence_reviewed_by?: string | null;
          evidence_summary?: string | null;
          expires_on?: string | null;
          forecast_assumptions?: Json;
          forecast_assumptions_version?: string | null;
          id?: string;
          organization_id: string;
          owner_user_id?: string | null;
          recoverable_cost: number;
          rounding_mode?: string;
          rounding_scale?: number;
          settlement_currency: string;
          status?: Database["public"]["Enums"]["recovery_agreement_status"];
          supersedes_id?: string | null;
          supplier_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          agreement_number?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          contractual_limit_amount?: number | null;
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          eligible_volume_basis?: Database["public"]["Enums"]["eligible_volume_basis"];
          evidence_document_version_id?: string | null;
          evidence_reference?: string | null;
          evidence_review_method?: string | null;
          evidence_reviewed_at?: string | null;
          evidence_reviewed_by?: string | null;
          evidence_summary?: string | null;
          expires_on?: string | null;
          forecast_assumptions?: Json;
          forecast_assumptions_version?: string | null;
          id?: string;
          organization_id?: string;
          owner_user_id?: string | null;
          recoverable_cost?: number;
          rounding_mode?: string;
          rounding_scale?: number;
          settlement_currency?: string;
          status?: Database["public"]["Enums"]["recovery_agreement_status"];
          supersedes_id?: string | null;
          supplier_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_agreement_evidence_same_tenant";
            columns: ["organization_id", "evidence_document_version_id"];
            isOneToOne: false;
            referencedRelation: "document_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreements_evidence_document_version_id_fkey";
            columns: ["evidence_document_version_id"];
            isOneToOne: false;
            referencedRelation: "document_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreements_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreements_organization_id_supersedes_id_fkey";
            columns: ["organization_id", "supersedes_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreements_organization_id_supplier_id_fkey";
            columns: ["organization_id", "supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_agreements_supersedes_id_fkey";
            columns: ["supersedes_id"];
            isOneToOne: false;
            referencedRelation: "recovery_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_agreements_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      recovery_rate_periods: {
        Row: {
          accrual_id: string;
          approved: boolean;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          currency: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          organization_id: string;
          per_unit_rate: number;
        };
        Insert: {
          accrual_id: string;
          approved?: boolean;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          currency: string;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          organization_id: string;
          per_unit_rate: number;
        };
        Update: {
          accrual_id?: string;
          approved?: boolean;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          currency?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          organization_id?: string;
          per_unit_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_rate_periods_accrual_id_fkey";
            columns: ["accrual_id"];
            isOneToOne: false;
            referencedRelation: "accruals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recovery_rate_periods_organization_id_accrual_id_fkey";
            columns: ["organization_id", "accrual_id"];
            isOneToOne: false;
            referencedRelation: "accruals";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "recovery_rate_periods_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      regions: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      report_runs: {
        Row: {
          created_at: string;
          id: string;
          manifest: Json;
          organization_id: string;
          output_storage_path: string | null;
          parameters: Json;
          report_type: string;
          requested_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          manifest: Json;
          organization_id: string;
          output_storage_path?: string | null;
          parameters?: Json;
          report_type: string;
          requested_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          manifest?: Json;
          organization_id?: string;
          output_storage_path?: string | null;
          parameters?: Json;
          report_type?: string;
          requested_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "report_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      seat_entitlements: {
        Row: {
          created_at: string;
          created_by: string | null;
          effective_from: string;
          effective_until: string | null;
          id: string;
          included_seats: number;
          organization_id: string;
          source: string;
          status: Database["public"]["Enums"]["entitlement_status"];
          subscription_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          effective_from: string;
          effective_until?: string | null;
          id?: string;
          included_seats: number;
          organization_id: string;
          source?: string;
          status?: Database["public"]["Enums"]["entitlement_status"];
          subscription_id: string;
          version: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          effective_until?: string | null;
          id?: string;
          included_seats?: number;
          organization_id?: string;
          source?: string;
          status?: Database["public"]["Enums"]["entitlement_status"];
          subscription_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seat_entitlements_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seat_entitlements_organization_id_subscription_id_fkey";
            columns: ["organization_id", "subscription_id"];
            isOneToOne: false;
            referencedRelation: "organization_subscriptions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      suppliers: {
        Row: {
          created_at: string;
          external_code: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          external_code?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          external_code?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      technical_teams: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "technical_teams_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_architectures: {
        Row: {
          code: string;
          created_at: string;
          effective_from: string | null;
          effective_to: string | null;
          id: string;
          name: string;
          oem_id: string | null;
          organization_id: string;
          provenance_status: string;
          provider_identifier: string | null;
          provider_key: string | null;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          id?: string;
          name: string;
          oem_id?: string | null;
          organization_id: string;
          provenance_status?: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          id?: string;
          name?: string;
          oem_id?: string | null;
          organization_id?: string;
          provenance_status?: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_architectures_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_architectures_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_architectures_organization_id_oem_id_fkey";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      vehicle_makes: {
        Row: {
          created_at: string;
          effective_from: string | null;
          effective_to: string | null;
          id: string;
          name: string;
          oem_id: string;
          organization_id: string;
          provenance_status: string;
          provider_identifier: string | null;
          provider_key: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          id?: string;
          name: string;
          oem_id: string;
          organization_id: string;
          provenance_status?: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          id?: string;
          name?: string;
          oem_id?: string;
          organization_id?: string;
          provenance_status?: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_makes_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_makes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_makes_organization_id_oem_id_fkey";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      vehicle_models: {
        Row: {
          code: string;
          created_at: string;
          effective_from: string | null;
          effective_to: string | null;
          id: string;
          name: string;
          oem_id: string;
          organization_id: string;
          provenance_status: string;
          provider_identifier: string | null;
          provider_key: string | null;
          updated_at: string;
          vehicle_architecture_id: string | null;
          vehicle_make_id: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          id?: string;
          name: string;
          oem_id: string;
          organization_id: string;
          provenance_status?: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          updated_at?: string;
          vehicle_architecture_id?: string | null;
          vehicle_make_id?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          id?: string;
          name?: string;
          oem_id?: string;
          organization_id?: string;
          provenance_status?: string;
          provider_identifier?: string | null;
          provider_key?: string | null;
          updated_at?: string;
          vehicle_architecture_id?: string | null;
          vehicle_make_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_models_architecture_same_tenant";
            columns: ["organization_id", "vehicle_architecture_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_architectures";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_models_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_models_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_models_organization_id_oem_id_fkey";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_models_vehicle_architecture_id_fkey";
            columns: ["vehicle_architecture_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_architectures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_models_vehicle_make_id_fkey";
            columns: ["vehicle_make_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_makes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_models_vehicle_make_same_tenant";
            columns: ["organization_id", "vehicle_make_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_makes";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      vehicle_production_part_links: {
        Row: {
          created_at: string;
          eligible_part_units_candidate: number | null;
          id: string;
          organization_id: string;
          part_id: string;
          part_vehicle_rule_id: string;
          vehicle_production_record_id: string;
        };
        Insert: {
          created_at?: string;
          eligible_part_units_candidate?: number | null;
          id?: string;
          organization_id: string;
          part_id: string;
          part_vehicle_rule_id: string;
          vehicle_production_record_id: string;
        };
        Update: {
          created_at?: string;
          eligible_part_units_candidate?: number | null;
          id?: string;
          organization_id?: string;
          part_id?: string;
          part_vehicle_rule_id?: string;
          vehicle_production_record_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_production_part_links_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_part_links_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_part_links_organization_id_part_vehicle_fkey";
            columns: ["organization_id", "part_vehicle_rule_id"];
            isOneToOne: false;
            referencedRelation: "part_vehicle_rules";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_part_links_organization_id_vehicle_prod_fkey";
            columns: ["organization_id", "vehicle_production_record_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_production_records";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_part_links_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_part_links_part_vehicle_rule_id_fkey";
            columns: ["part_vehicle_rule_id"];
            isOneToOne: false;
            referencedRelation: "part_vehicle_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_part_links_vehicle_production_record_id_fkey";
            columns: ["vehicle_production_record_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_production_records";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_production_records: {
        Row: {
          approved_at: string;
          approved_by: string | null;
          data_kind: Database["public"]["Enums"]["vehicle_volume_kind"];
          forecast_version_id: string | null;
          id: string;
          ingestion_posting_id: string;
          mapping_configuration_id: string;
          oem_id: string;
          organization_id: string;
          period: unknown;
          plant_id: string;
          program_id: string;
          provider_key: string;
          raw_record_id: string;
          region_id: string;
          source_record_id: string;
          source_units: number;
          supersedes_vehicle_production_record_id: string | null;
          vehicle_model_id: string;
        };
        Insert: {
          approved_at: string;
          approved_by?: string | null;
          data_kind: Database["public"]["Enums"]["vehicle_volume_kind"];
          forecast_version_id?: string | null;
          id?: string;
          ingestion_posting_id: string;
          mapping_configuration_id: string;
          oem_id: string;
          organization_id: string;
          period: unknown;
          plant_id: string;
          program_id: string;
          provider_key: string;
          raw_record_id: string;
          region_id: string;
          source_record_id: string;
          source_units: number;
          supersedes_vehicle_production_record_id?: string | null;
          vehicle_model_id: string;
        };
        Update: {
          approved_at?: string;
          approved_by?: string | null;
          data_kind?: Database["public"]["Enums"]["vehicle_volume_kind"];
          forecast_version_id?: string | null;
          id?: string;
          ingestion_posting_id?: string;
          mapping_configuration_id?: string;
          oem_id?: string;
          organization_id?: string;
          period?: unknown;
          plant_id?: string;
          program_id?: string;
          provider_key?: string;
          raw_record_id?: string;
          region_id?: string;
          source_record_id?: string;
          source_units?: number;
          supersedes_vehicle_production_record_id?: string | null;
          vehicle_model_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_production_records_forecast_version_id_fkey";
            columns: ["forecast_version_id"];
            isOneToOne: false;
            referencedRelation: "forecast_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_ingestion_posting_id_fkey";
            columns: ["ingestion_posting_id"];
            isOneToOne: true;
            referencedRelation: "ingestion_postings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_mapping_configuration_id_fkey";
            columns: ["mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_oem_id_fkey";
            columns: ["oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_forecast_versio_fkey";
            columns: ["organization_id", "forecast_version_id"];
            isOneToOne: false;
            referencedRelation: "forecast_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_ingestion_posti_fkey";
            columns: ["organization_id", "ingestion_posting_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_postings";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_mapping_configu_fkey";
            columns: ["organization_id", "mapping_configuration_id"];
            isOneToOne: false;
            referencedRelation: "configuration_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_oem_id_fkey";
            columns: ["organization_id", "oem_id"];
            isOneToOne: false;
            referencedRelation: "oems";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_plant_id_fkey";
            columns: ["organization_id", "plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_raw_record_id_fkey";
            columns: ["organization_id", "raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_ingestion_records";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_region_id_fkey";
            columns: ["organization_id", "region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_supersedes_vehi_fkey";
            columns: ["organization_id", "supersedes_vehicle_production_record_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_production_records";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_organization_id_vehicle_model_i_fkey";
            columns: ["organization_id", "vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "vehicle_production_records_plant_id_fkey";
            columns: ["plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_raw_record_id_fkey";
            columns: ["raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_ingestion_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_supersedes_vehicle_production_r_fkey";
            columns: ["supersedes_vehicle_production_record_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_production_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_production_records_vehicle_model_id_fkey";
            columns: ["vehicle_model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      volume_events: {
        Row: {
          department_id: string | null;
          effective_period: unknown;
          eligible_volume_basis: Database["public"]["Enums"]["eligible_volume_basis"];
          eligible_volume_policy_id: string | null;
          event_type: string;
          external_event_id: string;
          id: string;
          import_run_id: string | null;
          ingestion_posting_id: string | null;
          manual_approval_id: string | null;
          occurred_on: string;
          organization_id: string;
          part_id: string;
          part_vehicle_rule_id: string | null;
          program_id: string;
          provenance: Json;
          recorded_at: string;
          recorded_by: string | null;
          signed_eligible_units: number;
          source: string;
          technical_team_id: string | null;
        };
        Insert: {
          department_id?: string | null;
          effective_period?: unknown;
          eligible_volume_basis?: Database["public"]["Enums"]["eligible_volume_basis"];
          eligible_volume_policy_id?: string | null;
          event_type: string;
          external_event_id: string;
          id?: string;
          import_run_id?: string | null;
          ingestion_posting_id?: string | null;
          manual_approval_id?: string | null;
          occurred_on: string;
          organization_id: string;
          part_id: string;
          part_vehicle_rule_id?: string | null;
          program_id: string;
          provenance?: Json;
          recorded_at?: string;
          recorded_by?: string | null;
          signed_eligible_units: number;
          source: string;
          technical_team_id?: string | null;
        };
        Update: {
          department_id?: string | null;
          effective_period?: unknown;
          eligible_volume_basis?: Database["public"]["Enums"]["eligible_volume_basis"];
          eligible_volume_policy_id?: string | null;
          event_type?: string;
          external_event_id?: string;
          id?: string;
          import_run_id?: string | null;
          ingestion_posting_id?: string | null;
          manual_approval_id?: string | null;
          occurred_on?: string;
          organization_id?: string;
          part_id?: string;
          part_vehicle_rule_id?: string | null;
          program_id?: string;
          provenance?: Json;
          recorded_at?: string;
          recorded_by?: string | null;
          signed_eligible_units?: number;
          source?: string;
          technical_team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "volume_event_eligible_policy_same_tenant";
            columns: ["organization_id", "eligible_volume_policy_id"];
            isOneToOne: false;
            referencedRelation: "eligible_volume_policies";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "volume_event_import_same_tenant";
            columns: ["organization_id", "import_run_id"];
            isOneToOne: false;
            referencedRelation: "import_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "volume_event_ingestion_posting_same_tenant";
            columns: ["organization_id", "ingestion_posting_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_postings";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "volume_event_manual_approval_same_tenant";
            columns: ["organization_id", "manual_approval_id"];
            isOneToOne: false;
            referencedRelation: "approvals";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "volume_event_part_vehicle_rule_same_tenant";
            columns: ["organization_id", "part_vehicle_rule_id"];
            isOneToOne: false;
            referencedRelation: "part_vehicle_rules";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "volume_events_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volume_events_eligible_volume_policy_id_fkey";
            columns: ["eligible_volume_policy_id"];
            isOneToOne: false;
            referencedRelation: "eligible_volume_policies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volume_events_ingestion_posting_id_fkey";
            columns: ["ingestion_posting_id"];
            isOneToOne: false;
            referencedRelation: "ingestion_postings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volume_events_manual_approval_id_fkey";
            columns: ["manual_approval_id"];
            isOneToOne: false;
            referencedRelation: "approvals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volume_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volume_events_organization_id_part_id_fkey";
            columns: ["organization_id", "part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "volume_events_organization_id_program_id_fkey";
            columns: ["organization_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "volume_events_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volume_events_part_vehicle_rule_id_fkey";
            columns: ["part_vehicle_rule_id"];
            isOneToOne: false;
            referencedRelation: "part_vehicle_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volume_events_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volume_events_technical_team_id_fkey";
            columns: ["technical_team_id"];
            isOneToOne: false;
            referencedRelation: "technical_teams";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_token: string };
        Returns: string;
      };
      activate_recovery_agreement: {
        Args: { target_agreement_id: string };
        Returns: {
          agreement_number: string;
          approved_at: string | null;
          approved_by: string | null;
          contractual_limit_amount: number | null;
          created_at: string;
          effective_from: string | null;
          effective_to: string | null;
          eligible_volume_basis: Database["public"]["Enums"]["eligible_volume_basis"];
          evidence_document_version_id: string | null;
          evidence_reference: string | null;
          evidence_review_method: string | null;
          evidence_reviewed_at: string | null;
          evidence_reviewed_by: string | null;
          evidence_summary: string | null;
          expires_on: string | null;
          forecast_assumptions: Json;
          forecast_assumptions_version: string | null;
          id: string;
          organization_id: string;
          owner_user_id: string | null;
          recoverable_cost: number;
          rounding_mode: string;
          rounding_scale: number;
          settlement_currency: string;
          status: Database["public"]["Enums"]["recovery_agreement_status"];
          supersedes_id: string | null;
          supplier_id: string | null;
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "recovery_agreements";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_master_data_alias: {
        Args: { alias_data: Json; target_organization_id: string };
        Returns: string;
      };
      create_part_master_data: {
        Args: { master_data: Json; target_organization_id: string };
        Returns: Json;
      };
      create_program_master_data: {
        Args: { master_data: Json; target_organization_id: string };
        Returns: Json;
      };
      create_recovery_master_data: {
        Args: { master_data: Json; target_organization_id: string };
        Returns: Json;
      };
      get_program_parts_workspace: {
        Args: {
          as_of_date?: string;
          page_limit?: number;
          page_offset?: number;
          search_text?: string;
          selected_part_id?: string;
          selected_program_id?: string;
          sort_direction?: string;
          sort_field?: string;
          target_organization_id: string;
          target_view?: string;
        };
        Returns: Json;
      };
      get_recovery_workspace: {
        Args: { target_organization_id: string };
        Returns: Json;
      };
      review_and_activate_recovery_agreement: {
        Args: { target_agreement_id: string };
        Returns: string;
      };
      save_recovery_agreement_draft: {
        Args: {
          draft_data: Json;
          target_agreement_id: string;
          target_organization_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      configuration_kind:
        | "recovery_policy"
        | "dcr_workflow"
        | "notification_rules"
        | "document_mapping"
        | "import_mapping"
        | "retention_policy";
      configuration_status: "draft" | "active" | "superseded";
      dcr_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "active"
        | "closed"
        | "rejected"
        | "cancelled";
      eligible_volume_basis:
        "part_shipments" | "vehicle_production" | "invoiced_units" | "manual_approved";
      entitlement_status: "active" | "superseded" | "revoked";
      erp_transaction_type:
        | "shipment"
        | "purchase_order"
        | "invoice"
        | "material_document"
        | "cost"
        | "correction"
        | "reversal"
        | "return";
      grant_type: "department" | "technical_team" | "program" | "part";
      import_status: "uploaded" | "staged" | "validated" | "committed" | "failed" | "cancelled";
      ingestion_domain: "vehicle_volume" | "document" | "erp";
      ingestion_exception_type:
        | "duplicate"
        | "missing_mapping"
        | "conflicting_source"
        | "material_revision"
        | "validation"
        | "reconciliation";
      ingestion_lifecycle_status:
        | "received"
        | "staged"
        | "validated"
        | "mapped"
        | "reviewed"
        | "approved"
        | "posted"
        | "rejected"
        | "failed";
      ingestion_transport: "csv" | "excel" | "rest" | "odata" | "file_drop";
      invitation_status: "pending" | "accepted" | "expired" | "revoked";
      job_status: "pending" | "processing" | "completed" | "failed" | "cancelled";
      organization_role: "administrator" | "full_view" | "member";
      permission_name: "read" | "write" | "approve";
      recovery_agreement_status:
        "draft" | "under_review" | "approved" | "active" | "expired" | "superseded" | "rejected";
      subscription_status: "trialing" | "active" | "past_due" | "paused" | "cancelled" | "expired";
      vehicle_volume_kind: "actual" | "forecast" | "revised" | "scenario";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      configuration_kind: [
        "recovery_policy",
        "dcr_workflow",
        "notification_rules",
        "document_mapping",
        "import_mapping",
        "retention_policy",
      ],
      configuration_status: ["draft", "active", "superseded"],
      dcr_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "active",
        "closed",
        "rejected",
        "cancelled",
      ],
      eligible_volume_basis: [
        "part_shipments",
        "vehicle_production",
        "invoiced_units",
        "manual_approved",
      ],
      entitlement_status: ["active", "superseded", "revoked"],
      erp_transaction_type: [
        "shipment",
        "purchase_order",
        "invoice",
        "material_document",
        "cost",
        "correction",
        "reversal",
        "return",
      ],
      grant_type: ["department", "technical_team", "program", "part"],
      import_status: ["uploaded", "staged", "validated", "committed", "failed", "cancelled"],
      ingestion_domain: ["vehicle_volume", "document", "erp"],
      ingestion_exception_type: [
        "duplicate",
        "missing_mapping",
        "conflicting_source",
        "material_revision",
        "validation",
        "reconciliation",
      ],
      ingestion_lifecycle_status: [
        "received",
        "staged",
        "validated",
        "mapped",
        "reviewed",
        "approved",
        "posted",
        "rejected",
        "failed",
      ],
      ingestion_transport: ["csv", "excel", "rest", "odata", "file_drop"],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      job_status: ["pending", "processing", "completed", "failed", "cancelled"],
      organization_role: ["administrator", "full_view", "member"],
      permission_name: ["read", "write", "approve"],
      recovery_agreement_status: [
        "draft",
        "under_review",
        "approved",
        "active",
        "expired",
        "superseded",
        "rejected",
      ],
      subscription_status: ["trialing", "active", "past_due", "paused", "cancelled", "expired"],
      vehicle_volume_kind: ["actual", "forecast", "revised", "scenario"],
    },
  },
} as const;
