/**
 * User.
 */
export class User {
    /**
     * Name.
     */
    name: string = '';
    /**
     * Email.
     */
    email: string = '';
    /**
     * Avatar.
     */
    avatar: string = '';
    /**
     * Profile UID.
     */
    profileUid: string = '';
    /**
     * Office UID.
     */
    officeUid: string = '';
    /**
     * Creation time.
     */
    creationTime: number = 0;
    /**
     * Last send email time.
     */
    lastEmailTime?: number = 0;
    /**
     * Last login time.
     */
    lastLoginTime?: number = 0;
    active: boolean = false;
    /**
     * UID.
     */
    uid: string = '';
    editing?: boolean = false;
    static extract(item: User): any {
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
