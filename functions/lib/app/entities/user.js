"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * User.
 */
class User {
    constructor() {
        /**
         * Name.
         */
        this.name = '';
        /**
         * Email.
         */
        this.email = '';
        /**
         * Avatar.
         */
        this.avatar = '';
        /**
         * Profile UID.
         */
        this.profileUid = '';
        /**
         * Office UID.
         */
        this.officeUid = '';
        /**
         * Creation time.
         */
        this.creationTime = 0;
        /**
         * Last send email time.
         */
        this.lastEmailTime = 0;
        /**
         * Last login time.
         */
        this.lastLoginTime = 0;
        this.active = false;
        /**
         * UID.
         */
        this.uid = '';
        this.editing = false;
    }
    static extract(item) {
        const res = {};
        res['name'] = item.name;
        res['email'] = item.email;
        res['avatar'] = item.avatar;
        res['officeUid'] = item.officeUid;
        res['profileUid'] = item.profileUid;
        res['creationTime'] = item.creationTime;
        res['lastEmailTime'] = item.lastEmailTime;
        res['lastLoginTime'] = item.lastLoginTime;
        res['active'] = item.active;
        res['uid'] = item.uid;
        return res;
    }
}
exports.User = User;
//# sourceMappingURL=user.js.map