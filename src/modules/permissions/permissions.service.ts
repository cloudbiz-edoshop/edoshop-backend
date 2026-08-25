import {
  ALL_ENTITY_TYPES,
  buildPermissionKeys,
  CMS_ENTITIES,
  DELIVERY_ENTITIES,
  DIALOGUE_ENTITIES,
  EWMS_MANAGEMENT_ENTITIES,
  EWMS_W1_ENTITIES,
  EWMS_W2_ENTITIES,
  formatPermissionKey,
  NOTIFICATION_ENTITIES,
  READ_ONLY_OPERATIONS,
  SECTION_ENTITY_MAP,
  SETTINGS_ENTITIES,
  STANDARD_CRUD_OPERATIONS,
  STORE_ENTITIES,
  TICKETING_CORE_ENTITIES,
  TICKET_BORROW_LIMIT_ENTITIES,
  TRACKING_ENTITIES,
  type AccessSection,
  type PermissionPair,
} from "@/constants/permissions.constants";
import { EntityType, OperationType, RoleType } from "@/constants";
import { EmployeeRepository } from "@/modules/employees/employees.repository";
import { RoleRepository } from "@/modules/roles/roles.repository";
import { UserRepository } from "@/modules/users/users.repository";

export type UserAccessProfile = {
  isSuperAdmin: boolean;
  isAdminRole: boolean;
  role: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  permissions: string[];
  sections: Record<AccessSection, boolean>;
};

export class PermissionsService {
  private readonly userRepository = new UserRepository();
  private readonly employeeRepository = new EmployeeRepository();
  private readonly roleRepository = new RoleRepository();

  async getUserAccessProfile(userId: number): Promise<UserAccessProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return this.buildEmptyProfile();
    }

    if (user.isAdmin) {
      return this.buildSuperAdminProfile();
    }

    const employee = await this.employeeRepository.findByUserId(userId);
    if (!employee?.roleId) {
      return this.buildEmptyProfile();
    }

    const role = await this.roleRepository.findById(employee.roleId);
    if (!role) {
      return this.buildEmptyProfile();
    }
    const permissions = (role.permissions ?? []).map((permission) =>
      formatPermissionKey(
        permission.entity.name,
        permission.operation.name,
      ),
    );

    return {
      isSuperAdmin: false,
      isAdminRole: role.name.toLowerCase() === RoleType.ADMIN,
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
      },
      permissions,
      sections: this.buildSectionAccess(permissions),
    };
  }

  hasPermission(
    accessProfile: UserAccessProfile,
    entity: string,
    operation: string,
  ) {
    return accessProfile.permissions.includes(
      formatPermissionKey(entity, operation),
    );
  }

  hasAnyPermission(
    accessProfile: UserAccessProfile,
    required: PermissionPair[],
  ) {
    return required.some(({ entity, operation }) =>
      accessProfile.permissions.includes(formatPermissionKey(entity, operation)),
    );
  }

  canAccessSection(accessProfile: UserAccessProfile, section: AccessSection) {
    if (accessProfile.isSuperAdmin) {
      return true;
    }

    return accessProfile.sections[section] ?? false;
  }

  private buildSuperAdminProfile(): UserAccessProfile {
    const permissions = getRolePermissionTemplate(RoleType.SUPER_ADMIN);

    return {
      isSuperAdmin: true,
      isAdminRole: false,
      role: {
        id: 0,
        name: RoleType.SUPER_ADMIN,
        description: "Super Admin",
      },
      permissions,
      sections: Object.keys(SECTION_ENTITY_MAP).reduce(
        (sections, section) => {
          sections[section as AccessSection] = true;
          return sections;
        },
        {} as Record<AccessSection, boolean>,
      ),
    };
  }

  private buildEmptyProfile(): UserAccessProfile {
    return {
      isSuperAdmin: false,
      isAdminRole: false,
      role: null,
      permissions: [],
      sections: Object.keys(SECTION_ENTITY_MAP).reduce(
        (sections, section) => {
          sections[section as AccessSection] = false;
          return sections;
        },
        {} as Record<AccessSection, boolean>,
      ),
    };
  }

  private buildSectionAccess(permissions: string[]) {
    const permissionSet = new Set(permissions);
    const sectionAnchorEntities: Record<AccessSection, EntityType> = {
      settings: EntityType.SETTINGS,
      store: EntityType.STORES,
      cms: EntityType.BANNERS,
      dialogue: EntityType.CHAT,
      notifications: EntityType.NOTIFICATIONS,
      tracking: EntityType.TRACKING,
      ewms_w1: EntityType.WAREHOUSE_1,
      ewms_w2: EntityType.WAREHOUSE_2,
      ewms_management: EntityType.EWMS_MANAGEMENT,
      delivery: EntityType.DELIVERY_PLANS,
      ticketing: EntityType.TICKETING,
    };

    return Object.keys(SECTION_ENTITY_MAP).reduce(
      (sections, section) => {
        const accessSection = section as AccessSection;

        if (accessSection === "cms") {
          sections.cms = CMS_ENTITIES.some((entity) =>
            permissionSet.has(
              formatPermissionKey(entity, OperationType.READ),
            ),
          );
          return sections;
        }

        sections[accessSection] = permissionSet.has(
          formatPermissionKey(
            sectionAnchorEntities[accessSection],
            OperationType.READ,
          ),
        );
        return sections;
      },
      {} as Record<AccessSection, boolean>,
    );
  }
}

export function getRolePermissionTemplate(roleName: RoleType) {
  switch (roleName) {
    case RoleType.SUPER_ADMIN:
      return buildPermissionKeys(
        ALL_ENTITY_TYPES,
        Object.values(OperationType),
      ).filter(
        (permission) =>
          permission !== formatPermissionKey(
            EntityType.FAQS,
            OperationType.CREATE,
          ) &&
          permission !== formatPermissionKey(
            EntityType.FAQS,
            OperationType.UPDATE,
          ),
      );

    case RoleType.ADMIN: {
      const adminEntities = ALL_ENTITY_TYPES.filter(
        (entity) => !SETTINGS_ENTITIES.includes(entity),
      );
      return [
        ...buildPermissionKeys(adminEntities, Object.values(OperationType)),
        ...buildPermissionKeys(
          [EntityType.ROLES],
          [
            OperationType.CREATE,
            OperationType.READ,
            OperationType.UPDATE,
            OperationType.DELETE,
          ],
        ),
        ...buildPermissionKeys(
          [EntityType.ENTITIES, EntityType.OPERATIONS],
          READ_ONLY_OPERATIONS,
        ),
      ];
    }

    case RoleType.AUDITOR:
      return buildPermissionKeys(
        [...STORE_ENTITIES, ...EWMS_W1_ENTITIES, ...EWMS_W2_ENTITIES],
        READ_ONLY_OPERATIONS,
      );

    case RoleType.W1_TECH:
      return buildPermissionKeys(
        [...STORE_ENTITIES, ...EWMS_W1_ENTITIES, ...TICKETING_CORE_ENTITIES],
        STANDARD_CRUD_OPERATIONS,
      );

    case RoleType.W2_TECH:
      return buildPermissionKeys(
        [...STORE_ENTITIES, ...EWMS_W2_ENTITIES, ...TICKETING_CORE_ENTITIES],
        STANDARD_CRUD_OPERATIONS,
      );

    case RoleType.CUSTOMER_SERVICE:
      return buildPermissionKeys(
        [
          ...DIALOGUE_ENTITIES,
          ...CMS_ENTITIES,
          ...NOTIFICATION_ENTITIES,
          ...TRACKING_ENTITIES,
        ],
        STANDARD_CRUD_OPERATIONS,
      );

    case RoleType.WAREHOUSE_SUPERVISOR:
      return buildPermissionKeys(
        [
          ...STORE_ENTITIES,
          ...EWMS_W1_ENTITIES,
          ...EWMS_W2_ENTITIES,
          ...EWMS_MANAGEMENT_ENTITIES,
          ...DELIVERY_ENTITIES,
          ...TICKETING_CORE_ENTITIES,
        ],
        STANDARD_CRUD_OPERATIONS,
      );

    case RoleType.DIGITAL_MARKETER:
      return buildPermissionKeys(
        [...STORE_ENTITIES, ...CMS_ENTITIES, ...TICKETING_CORE_ENTITIES],
        STANDARD_CRUD_OPERATIONS,
      );

    case RoleType.MANAGER: {
      const systemEntities = [
        EntityType.ENTITIES,
        EntityType.OPERATIONS,
        EntityType.ROLES,
        EntityType.USERS,
        EntityType.EMPLOYEES,
        ...SETTINGS_ENTITIES,
      ];
      const managerEntities = ALL_ENTITY_TYPES.filter(
        (entity) =>
          !systemEntities.includes(entity) &&
          !TICKET_BORROW_LIMIT_ENTITIES.includes(entity),
      );

      return [
        ...buildPermissionKeys(managerEntities, [
          OperationType.CREATE,
          OperationType.READ,
          OperationType.UPDATE,
        ]),
        ...buildPermissionKeys(
          [EntityType.ENTITIES, EntityType.OPERATIONS, EntityType.ROLES, EntityType.USERS],
          READ_ONLY_OPERATIONS,
        ),
        ...buildPermissionKeys(TICKETING_CORE_ENTITIES, STANDARD_CRUD_OPERATIONS),
      ];
    }

    default:
      return [];
  }
}
